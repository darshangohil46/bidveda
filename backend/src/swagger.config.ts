import { DocumentBuilder } from '@nestjs/swagger';

/** One definition, used by the running server (/api/docs) and by the static export (docs/openapi.json). */
export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Bidveda Mini RFQ Portal API')
    .setDescription(
      'Buyers publish RFQs, vendors quote before the deadline, buyers compare and award. ' +
        'Money is always an integer in minor units (paise). ' +
        'Errors: { statusCode, code, message, details? }. ' +
        'Buyer/vendor endpoints use the "user" bearer token; /admin endpoints use the "admin" token.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'user')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin')
    .build();
}
