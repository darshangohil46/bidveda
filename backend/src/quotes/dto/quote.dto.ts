import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_LINE_ITEMS } from '../../common/constants';
import { QuoteStatus } from '../../types/enums';
import { ComparisonSort } from '../../types/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class QuoteItemDto {
  @IsUUID()
  lineItemId: string;

  /** Price per unit in minor units (paise). Integer, so no float rounding anywhere. */
  @IsInt()
  @Min(1)
  @Max(1_000_000_000_000)
  unitPriceMinor: number;
}

export class UpsertQuoteDto {
  /** Exactly one price for every line item of the RFQ. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsInt()
  @Min(1)
  @Max(3650)
  deliveryDays: number;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AwardDto {
  @IsUUID()
  quoteId: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListMyQuotesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(Object.values(QuoteStatus))
  status?: QuoteStatus;
}

export class ComparisonQueryDto {
  @IsOptional()
  @IsIn(Object.values(ComparisonSort))
  sort?: ComparisonSort;
}
