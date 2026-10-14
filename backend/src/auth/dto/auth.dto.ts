import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { UserRole } from '../../types/enums';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export class SignupDto {
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  name: string;

  @Transform(trimLower)
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** 8-72 characters with at least one letter and one number. */
  @IsString()
  @Matches(PASSWORD_RULE, {
    message: 'Password must be 8-72 characters and include a letter and a number.',
  })
  password: string;

  @IsIn([UserRole.BUYER, UserRole.VENDOR])
  role: UserRole;

  @Transform(trim)
  @IsString()
  @Length(2, 200)
  companyName: string;

  /** International format, e.g. +919876543210. */
  @Transform(emptyToNull)
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format, e.g. +919876543210.',
  })
  phone?: string;
}

export class LoginDto {
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @IsString()
  @Length(1, 200)
  password: string;
}

export class RefreshDto {
  /** Sent by the Next.js server from its HttpOnly cookie. */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
