import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_LINE_ITEMS, RFQ_CATEGORIES } from '../../common/constants';
import { RfqSort, RfqStatus } from '../../types/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class LineItemDto {
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  name: string;

  /** Up to 3 decimal places, e.g. 2.5 kg. */
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(1_000_000_000)
  quantity: number;

  @Transform(trim)
  @IsString()
  @Length(1, 30)
  unit: string;
}

export class CreateRfqDto {
  @Transform(trim)
  @IsString()
  @Length(3, 200)
  title: string;

  @Transform(trim)
  @IsString()
  @Length(10, 5000)
  description: string;

  @IsIn([...RFQ_CATEGORIES])
  category: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryAddress?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  deliveryCity: string;

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  deliveryState: string;

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  deliveryCountry: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9 -]{1,18}[A-Za-z0-9]$/, { message: 'Enter a valid pincode.' })
  deliveryPincode: string;

  /** Optional budget in minor units (paise). Send null to clear it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000_000_00)
  budgetMinor?: number | null;

  /** ISO 8601 date-time, must be in the future. */
  @IsISO8601()
  deadline: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems: LineItemDto[];
}

export class UpdateRfqDto extends PartialType(CreateRfqDto) {}

export class ListRfqsQueryDto {
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

  /** Keyword search over title, description and category. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Buyers only. */
  @IsOptional()
  @IsIn(Object.values(RfqStatus))
  status?: RfqStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  /** Matches city, state, country or pincode. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  /** Vendors: deadline on or after this instant. */
  @IsOptional()
  @IsISO8601()
  deadlineFrom?: string;

  /** Vendors: deadline on or before this instant. */
  @IsOptional()
  @IsISO8601()
  deadlineTo?: string;

  @IsOptional()
  @IsIn(Object.values(RfqSort))
  sort?: RfqSort;
}
