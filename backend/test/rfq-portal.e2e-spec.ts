import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/test-app';

/**
 * API-level tests of the flows that matter: auth + roles, RFQ lifecycle, quote
 * submit/revise, the deadline lock, comparison, award, files, and admin RBAC.
 * They run against a real PostgreSQL database (bidveda_test) through the real HTTP stack.
 */
describe('Mini RFQ portal API', () => {
  let app: NestExpressApplication;
  let db: DataSource;

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

  let counter = 0;
  async function signup(role: 'BUYER' | 'VENDOR', company: string) {
    counter += 1;
    const res = await http()
      .post('/api/auth/signup')
      .send({
        name: `${company} Person`,
        email: `${role.toLowerCase()}${counter}@example.test`,
        password: 'Passw0rd!x',
        role,
        companyName: company,
        phone: '+919876543210',
      })
      .expect(201);
    return {
      token: res.body.accessToken as string,
      refreshToken: res.body.refreshToken as string,
      id: res.body.user.id as string,
      email: res.body.user.email as string,
    };
  }

  const rfqBody = (overrides: Record<string, unknown> = {}) => ({
    title: 'Office supplies for Hyderabad site',
    description: 'Chairs and desks for the new site office, delivered and assembled.',
    category: 'Furniture',
    deliveryCity: 'Hyderabad',
    deliveryState: 'Telangana',
    deliveryCountry: 'India',
    deliveryPincode: '500081',
    budgetMinor: 40_000_000,
    deadline: inDays(10),
    lineItems: [
      { name: 'Chairs', quantity: 100, unit: 'pcs' },
      { name: 'Desks', quantity: 20, unit: 'pcs' },
    ],
    ...overrides,
  });

  async function publishedRfq(buyerToken: string, overrides: Record<string, unknown> = {}) {
    const created = await http()
      .post('/api/rfqs')
      .set(bearer(buyerToken))
      .send(rfqBody(overrides))
      .expect(201);
    const published = await http()
      .post(`/api/rfqs/${created.body.id}/publish`)
      .set(bearer(buyerToken))
      .expect(200);
    return published.body as { id: string; lineItems: { id: string; name: string }[] };
  }

  /** prices are per line item, in line order, in minor units. */
  function submitQuote(
    vendorToken: string,
    rfq: { id: string; lineItems: { id: string }[] },
    prices: number[],
    deliveryDays: number,
    notes?: string,
  ) {
    return http()
      .put(`/api/rfqs/${rfq.id}/my-quote`)
      .set(bearer(vendorToken))
      .send({
        items: rfq.lineItems.map((line, index) => ({
          lineItemId: line.id,
          unitPriceMinor: prices[index],
        })),
        deliveryDays,
        notes,
      });
  }

  const expire = (rfqId: string) =>
    db.query(`UPDATE rfqs SET deadline = now() - interval '1 minute' WHERE id = $1`, [rfqId]);

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
    rmSync('./uploads-test', { recursive: true, force: true });
  });

  // ------------------------------------------------------------------ auth
  describe('auth and roles', () => {
    it('signs up, rejects a duplicate email and a weak password', async () => {
      const vendor = await signup('VENDOR', 'Dup Vendor');
      const duplicate = await http().post('/api/auth/signup').send({
        name: 'Again',
        email: vendor.email,
        password: 'Passw0rd!x',
        role: 'VENDOR',
        companyName: 'Dup Vendor',
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.code).toBe('EMAIL_TAKEN');

      const weak = await http().post('/api/auth/signup').send({
        name: 'Weak',
        email: 'weak@example.test',
        password: 'short',
        role: 'BUYER',
        companyName: 'Weak Co',
      });
      expect(weak.status).toBe(400);
    });

    it('logs in, refreshes, and the refresh token dies after logout', async () => {
      const buyer = await signup('BUYER', 'Session Buyer');

      const bad = await http()
        .post('/api/auth/login')
        .send({ email: buyer.email, password: 'wrong-pass1' });
      expect(bad.status).toBe(401);
      expect(bad.body.code).toBe('INVALID_CREDENTIALS');

      const login = await http()
        .post('/api/auth/login')
        .send({ email: buyer.email, password: 'Passw0rd!x' });
      expect(login.status).toBe(200);
      const second = login.body.refreshToken as string;
      expect(second).not.toBe(buyer.refreshToken); // a second device gets its own session

      const refreshed = await http().post('/api/auth/refresh').send({ refreshToken: second });
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.accessToken).toEqual(expect.any(String));

      await http().post('/api/auth/logout').send({ refreshToken: second }).expect(204);
      const after = await http().post('/api/auth/refresh').send({ refreshToken: second });
      expect(after.status).toBe(401);

      // the first device is unaffected
      await http().post('/api/auth/refresh').send({ refreshToken: buyer.refreshToken }).expect(200);
    });

    it('enforces roles: no token is 401, wrong role is 403', async () => {
      const vendor = await signup('VENDOR', 'Role Vendor');
      await http().post('/api/rfqs').send(rfqBody()).expect(401);
      const res = await http().post('/api/rfqs').set(bearer(vendor.token)).send(rfqBody());
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('does not accept a buyer token on admin endpoints', async () => {
      const buyer = await signup('BUYER', 'Token Buyer');
      await http().get('/api/admin/me').set(bearer(buyer.token)).expect(401);
    });
  });

  // ------------------------------------------------------------ RFQ lifecycle
  describe('RFQ lifecycle and visibility', () => {
    it('keeps drafts private, lets a draft or open RFQ be edited, and locks it at the deadline', async () => {
      const buyer = await signup('BUYER', 'Life Buyer');
      const otherBuyer = await signup('BUYER', 'Other Buyer');
      const vendor = await signup('VENDOR', 'Life Vendor');

      const draft = await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody())
        .expect(201);
      expect(draft.body.status).toBe('DRAFT');
      expect(draft.body.lineItems).toHaveLength(2);

      // a vendor and another buyer cannot see it (404, not 403)
      await http().get(`/api/rfqs/${draft.body.id}`).set(bearer(vendor.token)).expect(404);
      await http().get(`/api/rfqs/${draft.body.id}`).set(bearer(otherBuyer.token)).expect(404);

      const edited = await http()
        .patch(`/api/rfqs/${draft.body.id}`)
        .set(bearer(buyer.token))
        .send({ title: 'Edited title', lineItems: [{ name: 'Chairs', quantity: 5, unit: 'pcs' }] })
        .expect(200);
      expect(edited.body.title).toBe('Edited title');
      expect(edited.body.lineItems).toHaveLength(1);

      await http()
        .post(`/api/rfqs/${draft.body.id}/publish`)
        .set(bearer(otherBuyer.token))
        .expect(404);
      await http().post(`/api/rfqs/${draft.body.id}/publish`).set(bearer(buyer.token)).expect(200);
      await http().get(`/api/rfqs/${draft.body.id}`).set(bearer(vendor.token)).expect(200);

      // An open RFQ can still be corrected, line items included, while nobody has quoted.
      const stillEditable = await http()
        .patch(`/api/rfqs/${draft.body.id}`)
        .set(bearer(buyer.token))
        .send({
          title: 'Corrected after publishing',
          lineItems: [{ name: 'Chairs', quantity: 6, unit: 'pcs' }],
        })
        .expect(200);
      expect(stillEditable.body.title).toBe('Corrected after publishing');
      expect(stillEditable.body.status).toBe('PUBLISHED');
      expect(stillEditable.body.lineItems[0].quantity).toBe(6);

      const lineItems = stillEditable.body.lineItems as Array<{ id: string }>;
      await http()
        .put(`/api/rfqs/${draft.body.id}/my-quote`)
        .set(bearer(vendor.token))
        .send({
          items: lineItems.map((item) => ({ lineItemId: item.id, unitPriceMinor: 1000 })),
          deliveryDays: 7,
        })
        .expect(200);

      // After a vendor has quoted, the text can still change, but the line items they priced cannot.
      await http()
        .patch(`/api/rfqs/${draft.body.id}`)
        .set(bearer(buyer.token))
        .send({
          title: 'Clarified title',
          lineItems: [{ name: 'Chairs', quantity: 6, unit: 'pcs' }],
        })
        .expect(200);
      const lineItemsLocked = await http()
        .patch(`/api/rfqs/${draft.body.id}`)
        .set(bearer(buyer.token))
        .send({ lineItems: [{ name: 'Chairs', quantity: 60, unit: 'pcs' }] });
      expect(lineItemsLocked.status).toBe(409);
      expect(lineItemsLocked.body.code).toBe('RFQ_LINE_ITEMS_LOCKED');

      // Once the deadline has passed it can no longer be edited at all.
      await expire(draft.body.id);
      const locked = await http()
        .patch(`/api/rfqs/${draft.body.id}`)
        .set(bearer(buyer.token))
        .send({ title: 'Too late' });
      expect(locked.status).toBe(409);
      expect(locked.body.code).toBe('RFQ_NOT_EDITABLE');
    });

    it('rejects a deadline in the past and an empty line item list', async () => {
      const buyer = await signup('BUYER', 'Validation Buyer');
      const past = await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody({ deadline: inDays(-1) }));
      expect(past.status).toBe(400);
      expect(past.body.code).toBe('DEADLINE_IN_PAST');
      await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody({ lineItems: [] }))
        .expect(400);
    });

    it('lets vendors search and filter open RFQs with pagination, and buyers filter by status', async () => {
      const buyer = await signup('BUYER', 'Search Buyer');
      const vendor = await signup('VENDOR', 'Search Vendor');
      await publishedRfq(buyer.token, {
        title: 'Zebra widgets',
        category: 'Packaging',
        deliveryCity: 'Pune',
      });
      await publishedRfq(buyer.token, {
        title: 'Quokka gadgets',
        category: 'Packaging',
        deliveryCity: 'Chennai',
      });
      await publishedRfq(buyer.token, {
        title: 'Quokka gizmos',
        category: 'Electrical',
        deliveryCity: 'Chennai',
      });
      await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody({ title: 'Hidden draft' }))
        .expect(201);

      const keyword = await http().get('/api/rfqs?q=quokka').set(bearer(vendor.token)).expect(200);
      expect(keyword.body.total).toBe(2);

      const category = await http()
        .get('/api/rfqs?q=quokka&category=Electrical')
        .set(bearer(vendor.token))
        .expect(200);
      expect(category.body.items.map((item: { title: string }) => item.title)).toEqual([
        'Quokka gizmos',
      ]);

      const location = await http()
        .get('/api/rfqs?location=pune')
        .set(bearer(vendor.token))
        .expect(200);
      expect(location.body.items.map((item: { title: string }) => item.title)).toEqual([
        'Zebra widgets',
      ]);

      const paged = await http()
        .get('/api/rfqs?limit=2&page=2')
        .set(bearer(vendor.token))
        .expect(200);
      expect(paged.body.limit).toBe(2);
      expect(paged.body.page).toBe(2);
      expect(paged.body.items.length).toBeLessThanOrEqual(2);
      expect(paged.body.totalPages).toBeGreaterThanOrEqual(2);

      // the draft never shows up for vendors
      const all = await http().get('/api/rfqs?q=hidden').set(bearer(vendor.token)).expect(200);
      expect(all.body.total).toBe(0);

      const drafts = await http()
        .get('/api/rfqs?status=DRAFT')
        .set(bearer(buyer.token))
        .expect(200);
      expect(drafts.body.items.map((item: { title: string }) => item.title)).toEqual([
        'Hidden draft',
      ]);
      expect(drafts.body.statusCounts).toMatchObject({ DRAFT: 1, PUBLISHED: 3 });
    });
  });

  // -------------------------------------------------------------------- quotes
  describe('quotes: submit, revise, privacy', () => {
    it('computes totals on the server and keeps every revision', async () => {
      const buyer = await signup('BUYER', 'Quote Buyer');
      const vendor = await signup('VENDOR', 'Vendor A');
      const rfq = await publishedRfq(buyer.token);

      // Chairs 2,000 x 100 + Desks 8,000 x 20 = 3,60,000 (36,000,000 paise)
      const first = await submitQuote(
        vendor.token,
        rfq,
        [200_000, 800_000],
        10,
        'First offer',
      ).expect(200);
      expect(first.body.totalMinor).toBe(36_000_000);
      expect(first.body.revisionNo).toBe(1);
      expect(first.body.status).toBe('SUBMITTED');

      // revise the chair price to 1,900: total drops to 3,50,000
      const revised = await submitQuote(
        vendor.token,
        rfq,
        [190_000, 800_000],
        10,
        'Better price',
      ).expect(200);
      expect(revised.body.totalMinor).toBe(35_000_000);
      expect(revised.body.revisionNo).toBe(2);
      expect(revised.body.revisions.map((r: { totalMinor: number }) => r.totalMinor)).toEqual([
        36_000_000, 35_000_000,
      ]);

      // sending exactly the same content again does not create a revision
      const same = await submitQuote(
        vendor.token,
        rfq,
        [190_000, 800_000],
        10,
        'Better price',
      ).expect(200);
      expect(same.body.revisionNo).toBe(2);
    });

    it('requires a price for every line item and rejects unknown ones', async () => {
      const buyer = await signup('BUYER', 'Strict Buyer');
      const vendor = await signup('VENDOR', 'Strict Vendor');
      const rfq = await publishedRfq(buyer.token);

      const missing = await http()
        .put(`/api/rfqs/${rfq.id}/my-quote`)
        .set(bearer(vendor.token))
        .send({
          items: [{ lineItemId: rfq.lineItems[0].id, unitPriceMinor: 100 }],
          deliveryDays: 5,
        });
      expect(missing.status).toBe(400);
      expect(missing.body.code).toBe('MISSING_LINE_ITEM_PRICE');

      const unknown = await http()
        .put(`/api/rfqs/${rfq.id}/my-quote`)
        .set(bearer(vendor.token))
        .send({
          items: [
            { lineItemId: rfq.lineItems[0].id, unitPriceMinor: 100 },
            { lineItemId: rfq.lineItems[1].id, unitPriceMinor: 100 },
            { lineItemId: '11111111-1111-4111-8111-111111111111', unitPriceMinor: 100 },
          ],
          deliveryDays: 5,
        });
      expect(unknown.status).toBe(400);
      expect(unknown.body.code).toBe('UNKNOWN_LINE_ITEM');
    });

    it("keeps one vendor's quote hidden from the other vendor and from other buyers", async () => {
      const buyer = await signup('BUYER', 'Privacy Buyer');
      const otherBuyer = await signup('BUYER', 'Nosy Buyer');
      const vendorA = await signup('VENDOR', 'Private A');
      const vendorB = await signup('VENDOR', 'Private B');
      const rfq = await publishedRfq(buyer.token);

      const quoteA = (await submitQuote(vendorA.token, rfq, [200_000, 800_000], 10).expect(200))
        .body;
      await submitQuote(vendorB.token, rfq, [220_000, 700_000], 7).expect(200);

      await http().get(`/api/quotes/${quoteA.id}`).set(bearer(vendorB.token)).expect(404);
      await http().get(`/api/quotes/${quoteA.id}`).set(bearer(otherBuyer.token)).expect(404);
      await http().get(`/api/quotes/${quoteA.id}`).set(bearer(buyer.token)).expect(200);
      await http().get(`/api/rfqs/${rfq.id}/comparison`).set(bearer(vendorA.token)).expect(403);
      await http().get(`/api/rfqs/${rfq.id}/comparison`).set(bearer(otherBuyer.token)).expect(404);

      const mine = await http().get('/api/quotes/mine').set(bearer(vendorB.token)).expect(200);
      expect(mine.body.total).toBe(1);

      // the RFQ detail a vendor sees contains only their own quote
      const detail = await http().get(`/api/rfqs/${rfq.id}`).set(bearer(vendorB.token)).expect(200);
      expect(detail.body.myQuote.totalMinor).toBe(36_000_000);
      expect(detail.body.quoteCount).toBeUndefined();
    });

    it('rejects late submissions and late revisions with DEADLINE_PASSED', async () => {
      const buyer = await signup('BUYER', 'Late Buyer');
      const vendor = await signup('VENDOR', 'Early Vendor');
      const lateVendor = await signup('VENDOR', 'Late Vendor');
      const rfq = await publishedRfq(buyer.token);

      await submitQuote(vendor.token, rfq, [200_000, 800_000], 10).expect(200);
      await expire(rfq.id); // the deadline passes; the cron has not run yet

      const lateNew = await submitQuote(lateVendor.token, rfq, [1, 1], 1);
      expect(lateNew.status).toBe(409);
      expect(lateNew.body.code).toBe('DEADLINE_PASSED');

      const lateRevision = await submitQuote(vendor.token, rfq, [100_000, 100_000], 1);
      expect(lateRevision.status).toBe(409);
      expect(lateRevision.body.code).toBe('DEADLINE_PASSED');

      // the existing quote is untouched, and the RFQ flips to CLOSED the next time it is read
      const mine = await http()
        .get(`/api/rfqs/${rfq.id}/my-quote`)
        .set(bearer(vendor.token))
        .expect(200);
      expect(mine.body.quote.totalMinor).toBe(36_000_000);
      const detail = await http().get(`/api/rfqs/${rfq.id}`).set(bearer(buyer.token)).expect(200);
      expect(detail.body.status).toBe('CLOSED');
    });
  });

  // ------------------------------------------------------------------- award
  describe('comparison and award', () => {
    async function twoQuoteRfq() {
      const buyer = await signup('BUYER', 'Award Buyer');
      const vendorA = await signup('VENDOR', 'Award A');
      const vendorB = await signup('VENDOR', 'Award B');
      const rfq = await publishedRfq(buyer.token);
      const quoteA = (await submitQuote(vendorA.token, rfq, [190_000, 800_000], 10).expect(200))
        .body;
      const quoteB = (await submitQuote(vendorB.token, rfq, [220_000, 700_000], 7).expect(200))
        .body;
      return { buyer, vendorA, vendorB, rfq, quoteA, quoteB };
    }

    it('sorts the comparison by total price and by delivery time', async () => {
      const { buyer, rfq, quoteA, quoteB } = await twoQuoteRfq();

      const byTotal = await http()
        .get(`/api/rfqs/${rfq.id}/comparison?sort=total_asc`)
        .set(bearer(buyer.token))
        .expect(200);
      expect(byTotal.body.quotes.map((q: { id: string }) => q.id)).toEqual([quoteA.id, quoteB.id]); // 3,50,000 < 3,60,000

      const byDelivery = await http()
        .get(`/api/rfqs/${rfq.id}/comparison?sort=delivery_asc`)
        .set(bearer(buyer.token))
        .expect(200);
      expect(byDelivery.body.quotes.map((q: { id: string }) => q.id)).toEqual([
        quoteB.id,
        quoteA.id,
      ]); // 7 days < 10 days
      expect(byDelivery.body.quotes[0].vendor.companyName).toBe('Award B');
    });

    it('cannot award before the deadline', async () => {
      const { buyer, rfq, quoteA } = await twoQuoteRfq();
      const res = await http()
        .post(`/api/rfqs/${rfq.id}/award`)
        .set(bearer(buyer.token))
        .send({ quoteId: quoteA.id });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RFQ_NOT_CLOSED');
    });

    it('awards one quote: accepted / rejected / awarded, with a full history', async () => {
      const { buyer, vendorA, vendorB, rfq, quoteA, quoteB } = await twoQuoteRfq();
      await expire(rfq.id);

      // vendors cannot award, other buyers cannot award
      await http()
        .post(`/api/rfqs/${rfq.id}/award`)
        .set(bearer(vendorA.token))
        .send({ quoteId: quoteA.id })
        .expect(403);
      const outsider = await signup('BUYER', 'Outsider');
      await http()
        .post(`/api/rfqs/${rfq.id}/award`)
        .set(bearer(outsider.token))
        .send({ quoteId: quoteA.id })
        .expect(404);

      // shortlist, then award vendor B for faster delivery, not the lowest price
      const shortlisted = await http()
        .post(`/api/rfqs/${rfq.id}/quotes/${quoteB.id}/shortlist`)
        .set(bearer(buyer.token))
        .expect(200);
      expect(shortlisted.body.status).toBe('SHORTLISTED');

      const award = await http()
        .post(`/api/rfqs/${rfq.id}/award`)
        .set(bearer(buyer.token))
        .send({ quoteId: quoteB.id, note: 'Faster delivery' })
        .expect(200);
      expect(award.body.status).toBe('AWARDED');
      expect(award.body.awardedQuoteId).toBe(quoteB.id);

      const comparison = await http()
        .get(`/api/rfqs/${rfq.id}/comparison`)
        .set(bearer(buyer.token))
        .expect(200);
      const statuses = Object.fromEntries(
        comparison.body.quotes.map((q: { id: string; status: string }) => [q.id, q.status]),
      );
      expect(statuses).toEqual({ [quoteA.id]: 'REJECTED', [quoteB.id]: 'ACCEPTED' });
      expect(comparison.body.rfq.status).toBe('AWARDED');

      // second award is refused, and a decided RFQ cannot take new quotes
      const again = await http()
        .post(`/api/rfqs/${rfq.id}/award`)
        .set(bearer(buyer.token))
        .send({ quoteId: quoteA.id });
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('RFQ_ALREADY_AWARDED');

      // history keeps every transition, in order
      const history = await http()
        .get(`/api/rfqs/${rfq.id}/history`)
        .set(bearer(buyer.token))
        .expect(200);
      const trail = history.body.map(
        (h: { quoteId: string | null; fromStatus: string | null; toStatus: string }) =>
          `${h.quoteId ? 'quote' : 'rfq'}:${h.fromStatus ?? '-'}>${h.toStatus}`,
      );
      expect(trail).toEqual(
        expect.arrayContaining([
          'rfq:->DRAFT',
          'rfq:DRAFT>PUBLISHED',
          'quote:->SUBMITTED',
          'rfq:PUBLISHED>CLOSED',
          'quote:SUBMITTED>SHORTLISTED',
          'quote:SHORTLISTED>ACCEPTED',
          'quote:SUBMITTED>REJECTED',
          'rfq:CLOSED>AWARDED',
        ]),
      );

      // vendor B sees only RFQ events and their own quote's events
      const vendorTrail = await http()
        .get(`/api/rfqs/${rfq.id}/history`)
        .set(bearer(vendorB.token))
        .expect(200);
      const quoteIds = new Set(
        vendorTrail.body.map((h: { quoteId: string | null }) => h.quoteId).filter(Boolean),
      );
      expect([...quoteIds]).toEqual([quoteB.id]);

      // the losing vendor can still see their own outcome
      const loser = await http()
        .get(`/api/rfqs/${rfq.id}/my-quote`)
        .set(bearer(vendorA.token))
        .expect(200);
      expect(loser.body.quote.status).toBe('REJECTED');
    });

    it('lets exactly one of two simultaneous awards win', async () => {
      const { buyer, rfq, quoteA, quoteB } = await twoQuoteRfq();
      await expire(rfq.id);

      const results = await Promise.all([
        http()
          .post(`/api/rfqs/${rfq.id}/award`)
          .set(bearer(buyer.token))
          .send({ quoteId: quoteA.id }),
        http()
          .post(`/api/rfqs/${rfq.id}/award`)
          .set(bearer(buyer.token))
          .send({ quoteId: quoteB.id }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);

      const accepted = await db.query(
        `SELECT count(*)::int AS n FROM quotes WHERE rfq_id = $1 AND status = 'ACCEPTED'`,
        [rfq.id],
      );
      expect(accepted[0].n).toBe(1);
    });
  });

  // ------------------------------------------------------------------- files
  describe('file upload and download', () => {
    it('accepts a real PDF, serves it with safe headers, and rejects fakes and wrong types', async () => {
      const buyer = await signup('BUYER', 'File Buyer');
      const vendor = await signup('VENDOR', 'File Vendor');
      const outsider = await signup('VENDOR', 'File Outsider');
      const rfq = await publishedRfq(buyer.token);

      const ok = await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', PDF, { filename: 'spec.pdf', contentType: 'application/pdf' })
        .expect(201);
      expect(ok.body.originalName).toBe('spec.pdf');

      const wrongType = await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', Buffer.from('MZ binary'), {
          filename: 'virus.exe',
          contentType: 'application/octet-stream',
        });
      expect(wrongType.status).toBe(400);
      expect(wrongType.body.code).toBe('FILE_TYPE_NOT_ALLOWED');

      const fake = await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', Buffer.from('<script>alert(1)</script>'), {
          filename: 'evil.pdf',
          contentType: 'application/pdf',
        });
      expect(fake.status).toBe(400);
      expect(fake.body.code).toBe('FILE_CONTENT_MISMATCH');

      const randomZip = await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), { filename: 'notes.xlsx' });
      expect(randomZip.body.code).toBe('FILE_CONTENT_MISMATCH');

      const xlsx = await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(buyer.token))
        .attach(
          'file',
          Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('xl/workbook.xml')]),
          {
            filename: 'boq.xlsx',
          },
        )
        .expect(201);
      expect(xlsx.body.mimeType).toContain('spreadsheetml');

      // vendors cannot upload to an RFQ, but can download from a published one
      await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(vendor.token))
        .attach('file', PDF, 'a.pdf')
        .expect(403);
      const download = await http()
        .get(`/api/attachments/${ok.body.id}/download`)
        .set(bearer(vendor.token))
        .expect(200);
      expect(download.headers['x-content-type-options']).toBe('nosniff');
      expect(download.headers['content-disposition']).toContain('attachment');
      expect(download.headers['content-type']).toContain('application/pdf');

      // an unauthenticated caller gets nothing
      await http().get(`/api/attachments/${ok.body.id}/download`).expect(401);

      // a draft RFQ's files are private to its buyer
      const draft = await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody())
        .expect(201);
      const draftFile = await http()
        .post(`/api/rfqs/${draft.body.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', PDF, 'draft.pdf')
        .expect(201);
      await http()
        .get(`/api/attachments/${draftFile.body.id}/download`)
        .set(bearer(outsider.token))
        .expect(404);
    });

    it("keeps a vendor's quote documents private and locks them at the deadline", async () => {
      const buyer = await signup('BUYER', 'Doc Buyer');
      const vendorA = await signup('VENDOR', 'Doc A');
      const vendorB = await signup('VENDOR', 'Doc B');
      const rfq = await publishedRfq(buyer.token);
      const quote = (await submitQuote(vendorA.token, rfq, [200_000, 800_000], 10).expect(200))
        .body;

      const file = await http()
        .post(`/api/quotes/${quote.id}/attachments`)
        .set(bearer(vendorA.token))
        .attach('file', PDF, 'brochure.pdf')
        .expect(201);

      await http()
        .get(`/api/attachments/${file.body.id}/download`)
        .set(bearer(vendorA.token))
        .expect(200);
      await http()
        .get(`/api/attachments/${file.body.id}/download`)
        .set(bearer(buyer.token))
        .expect(200);
      await http()
        .get(`/api/attachments/${file.body.id}/download`)
        .set(bearer(vendorB.token))
        .expect(404);
      await http()
        .post(`/api/quotes/${quote.id}/attachments`)
        .set(bearer(vendorB.token))
        .attach('file', PDF, 'x.pdf')
        .expect(404);

      await expire(rfq.id);
      const late = await http()
        .post(`/api/quotes/${quote.id}/attachments`)
        .set(bearer(vendorA.token))
        .attach('file', PDF, 'late.pdf');
      expect(late.status).toBe(409);
      expect(late.body.code).toBe('DEADLINE_PASSED');
      await http()
        .delete(`/api/attachments/${file.body.id}`)
        .set(bearer(vendorA.token))
        .expect(409);
    });
  });

  // -------------------------------------------------------------------- admin
  describe('admin: roles and permissions', () => {
    let superToken: string;
    let superId: string;
    let superRoleId: string;

    const adminLogin = (email: string, password: string) =>
      http().post('/api/auth/admin/login').send({ email, password });

    beforeAll(async () => {
      const res = await adminLogin('superadmin@bidveda.test', 'SuperAdmin@123').expect(200);
      superToken = res.body.accessToken;
      superId = res.body.admin.id;
      superRoleId = res.body.admin.roleId;
    });

    it('seeds a Super Admin with every permission on every registered resource', async () => {
      const me = await http().get('/api/admin/me').set(bearer(superToken)).expect(200);
      expect(me.body.role).toBe('Super Admin');
      expect(me.body.isSystem).toBe(true);
      expect(me.body.permissions.users).toEqual({
        create: true,
        read: true,
        update: true,
        delete: false,
      });
      expect(me.body.permissions.rfqs).toEqual({
        create: false,
        read: true,
        update: false,
        delete: false,
      });

      const resources = await http()
        .get('/api/admin/resources')
        .set(bearer(superToken))
        .expect(200);
      const keys = resources.body.map((r: { key: string }) => r.key);
      expect(keys).toEqual(
        expect.arrayContaining(['admins', 'admin_roles', 'permissions', 'users', 'rfqs', 'quotes']),
      );

      const permissions = await http()
        .get('/api/admin/permissions?limit=100')
        .set(bearer(superToken))
        .expect(200);
      expect(permissions.body.total).toBe(keys.length * 4);

      const counts = await http()
        .get('/api/admin/dashboard/counts')
        .set(bearer(superToken))
        .expect(200);
      expect(counts.body.rfqs).toEqual(expect.any(Number));
    });

    it('lets the admin manage users and see everything, but not edit marketplace data', async () => {
      const target = await signup('VENDOR', 'Soon Deactivated');
      await http().get('/api/auth/me').set(bearer(target.token)).expect(200);

      const users = await http()
        .get('/api/admin/users?search=Soon%20Deactivated&limit=5')
        .set(bearer(superToken))
        .expect(200);
      expect(users.body.items).toHaveLength(1);
      expect(users.body.items[0].password).toBeUndefined(); // secrets never leave the API

      const deactivated = await http()
        .patch(`/api/admin/users/${target.id}`)
        .set(bearer(superToken))
        .send({ isActive: false })
        .expect(200);
      expect(deactivated.body.isActive).toBe(false);

      // locked out at once: new sign-ins are refused AND the token they already hold stops working
      const login = await http()
        .post('/api/auth/login')
        .send({ email: target.email, password: 'Passw0rd!x' });
      expect(login.status).toBe(403);
      expect(login.body.code).toBe('ACCOUNT_DISABLED');
      const stillHolding = await http().get('/api/auth/me').set(bearer(target.token));
      expect(stillHolding.status).toBe(401);
      expect(stillHolding.body.code).toBe('SESSION_ENDED');

      const readOnly = await http()
        .post('/api/admin/rfqs')
        .set(bearer(superToken))
        .send({ title: 'x' });
      expect(readOnly.status).toBe(403);
      expect(readOnly.body.code).toBe('READ_ONLY_RESOURCE');

      const rfqs = await http().get('/api/admin/rfqs?limit=3').set(bearer(superToken)).expect(200);
      expect(rfqs.body.items[0].buyer).toEqual({
        id: expect.any(String),
        label: expect.any(String),
      }); // FK expanded
    });

    it('enforces a custom role: read-only auditor cannot write, and every change is audit-logged', async () => {
      const role = await http()
        .post('/api/admin/admin_roles')
        .set(bearer(superToken))
        .send({
          name: 'Auditor',
          description: 'Reads marketplace data only',
          permissions: {
            rfqs: { read: true },
            quotes: { read: true },
            users: { read: true, update: true },
          },
        })
        .expect(201);
      expect(role.body.slug).toBe('auditor');
      expect(role.body.permissions.users).toMatchObject({
        read: true,
        update: true,
        create: false,
      });
      expect(role.body.permissions.admins.read).toBe(false);

      await http()
        .post('/api/admin/admins')
        .set(bearer(superToken))
        .send({
          name: 'Audrey Auditor',
          email: 'auditor@example.test',
          password: 'Auditor@123',
          role: { id: role.body.id },
        })
        .expect(201);

      const login = await adminLogin('auditor@example.test', 'Auditor@123').expect(200);
      const token = login.body.accessToken as string;

      await http().get('/api/admin/rfqs').set(bearer(token)).expect(200);
      const noAdmins = await http().get('/api/admin/admins').set(bearer(token));
      expect(noAdmins.status).toBe(403);
      expect(noAdmins.body.code).toBe('FORBIDDEN_PERMISSION');
      await http().post('/api/admin/users').set(bearer(token)).send({}).expect(403);
      await http().delete(`/api/admin/rfqs/${superId}`).set(bearer(token)).expect(403);

      // may update users (granted) but may not hand out the Super Admin role
      await http().post('/api/admin/admins').set(bearer(token)).send({}).expect(403);

      const audit = await http()
        .get('/api/admin/admin_audit_logs?search=admin_roles')
        .set(bearer(superToken))
        .expect(200);
      const entry = audit.body.items.find(
        (row: { recordId: string }) => row.recordId === role.body.id,
      );
      expect(entry).toMatchObject({ action: 'CREATE', adminEmail: 'superadmin@bidveda.test' });

      const adminCreate = await http()
        .get('/api/admin/admin_audit_logs?search=auditor@example.test')
        .set(bearer(superToken))
        .expect(200);
      expect(JSON.stringify(adminCreate.body)).not.toContain('Auditor@123'); // passwords are redacted
    });

    it('protects the Super Admin role and the last Super Admin', async () => {
      const del = await http()
        .delete(`/api/admin/admin_roles/${superRoleId}`)
        .set(bearer(superToken));
      expect(del.status).toBe(403);
      expect(del.body.code).toBe('SYSTEM_ROLE_PROTECTED');

      const self = await http()
        .patch(`/api/admin/admins/${superId}`)
        .set(bearer(superToken))
        .send({ isActive: false });
      expect(self.status).toBe(400);
      expect(self.body.code).toBe('CANNOT_DEACTIVATE_SELF');

      const selfDelete = await http()
        .delete(`/api/admin/admins/${superId}`)
        .set(bearer(superToken));
      expect(selfDelete.body.code).toBe('CANNOT_DELETE_SELF');
    });

    it('returns a clear validation error with per-field messages', async () => {
      const res = await http()
        .post('/api/admin/admins')
        .set(bearer(superToken))
        .send({ name: 'No Email', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(res.body.details.fields)).toEqual(
        expect.arrayContaining(['email', 'password', 'role']),
      );
    });

    it('requires a phone number with a country code, and normalises it', async () => {
      const bad = await http().post('/api/admin/users').set(bearer(superToken)).send({
        name: 'Phone Test',
        email: 'phone.bad@example.test',
        password: 'Passw0rd!x',
        role: 'VENDOR',
        companyName: 'Phone Co',
        phone: '98765 43210',
      });
      expect(bad.status).toBe(400);
      expect(bad.body.details.fields.phone).toContain('country code');

      const good = await http()
        .post('/api/admin/users')
        .set(bearer(superToken))
        .send({
          name: 'Phone Test',
          email: 'phone.good@example.test',
          password: 'Passw0rd!x',
          role: 'VENDOR',
          companyName: 'Phone Co',
          phone: '+91 98765-43210',
        })
        .expect(201);
      expect(good.body.phone).toBe('+919876543210');
    });
  });

  // ------------------------------------------------------------ edge cases
  describe('edge cases', () => {
    it('refuses to publish a draft whose deadline has already passed', async () => {
      const buyer = await signup('BUYER', 'Stale Draft Buyer');
      const draft = await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody())
        .expect(201);
      await expire(draft.body.id);

      const res = await http().post(`/api/rfqs/${draft.body.id}/publish`).set(bearer(buyer.token));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DEADLINE_IN_PAST');
    });

    it('cannot shortlist or award again once the RFQ is awarded', async () => {
      const buyer = await signup('BUYER', 'Done Buyer');
      const vendorA = await signup('VENDOR', 'Done A');
      const vendorB = await signup('VENDOR', 'Done B');
      const rfq = await publishedRfq(buyer.token);
      const quoteA = (await submitQuote(vendorA.token, rfq, [200_000, 800_000], 10).expect(200))
        .body;
      const quoteB = (await submitQuote(vendorB.token, rfq, [220_000, 700_000], 7).expect(200))
        .body;
      await expire(rfq.id);
      await http()
        .post(`/api/rfqs/${rfq.id}/award`)
        .set(bearer(buyer.token))
        .send({ quoteId: quoteA.id })
        .expect(200);

      const shortlist = await http()
        .post(`/api/rfqs/${rfq.id}/quotes/${quoteB.id}/shortlist`)
        .set(bearer(buyer.token));
      expect(shortlist.status).toBe(409);
      expect(shortlist.body.code).toBe('RFQ_ALREADY_AWARDED');
    });

    it('does not create duplicate quotes when a vendor double-submits at the same instant', async () => {
      const buyer = await signup('BUYER', 'Race Buyer');
      const vendor = await signup('VENDOR', 'Race Vendor');
      const rfq = await publishedRfq(buyer.token);

      const results = await Promise.all([
        submitQuote(vendor.token, rfq, [200_000, 800_000], 10),
        submitQuote(vendor.token, rfq, [200_000, 800_000], 10),
      ]);

      // One wins outright; the other either replays the same content (200) or hits the unique key (409).
      results.forEach((res) => expect([200, 409]).toContain(res.status));
      expect(results.some((res) => res.status === 200)).toBe(true);

      const rows = await db.query(
        `SELECT count(*)::int AS quotes FROM quotes WHERE rfq_id = $1 AND vendor_id = $2`,
        [rfq.id, vendor.id],
      );
      expect(rows[0].quotes).toBe(1);
      const revisions = await db.query(
        `SELECT count(*)::int AS n FROM quote_revisions r JOIN quotes q ON q.id = r.quote_id WHERE q.rfq_id = $1`,
        [rfq.id],
      );
      expect(revisions[0].n).toBe(1); // identical content never creates a second revision
    });

    it('rejects an oversized upload with 413 before it reaches the disk', async () => {
      const buyer = await signup('BUYER', 'Big File Buyer');
      const rfq = await publishedRfq(buyer.token);
      const huge = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(10.5 * 1024 * 1024)]);

      const res = await http()
        .post(`/api/rfqs/${rfq.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', huge, { filename: 'huge.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(413);
      expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');

      const stored = await db.query(
        `SELECT count(*)::int AS n FROM attachments WHERE rfq_id = $1`,
        [rfq.id],
      );
      expect(stored[0].n).toBe(0);
    });

    it('deletes the files from disk when a draft is deleted', async () => {
      const buyer = await signup('BUYER', 'Cleanup Buyer');
      const draft = await http()
        .post('/api/rfqs')
        .set(bearer(buyer.token))
        .send(rfqBody())
        .expect(201);
      await http()
        .post(`/api/rfqs/${draft.body.id}/attachments`)
        .set(bearer(buyer.token))
        .attach('file', PDF, 'spec.pdf')
        .expect(201);

      const [{ stored_name: storedName }] = await db.query(
        `SELECT stored_name FROM attachments WHERE rfq_id = $1`,
        [draft.body.id],
      );
      expect(existsSync(join('./uploads-test', storedName))).toBe(true);

      await http().delete(`/api/rfqs/${draft.body.id}`).set(bearer(buyer.token)).expect(204);
      expect(existsSync(join('./uploads-test', storedName))).toBe(false);
    });
  });
});
