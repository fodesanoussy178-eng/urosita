import { describe, expect, it } from 'vitest';
import { isPaymentBlocked, needsVerificationPrompt, maskIban, isPlausibleIban } from './kycService';

describe('isPaymentBlocked', () => {
  it('blocks every status except verified', () => {
    expect(isPaymentBlocked('verified')).toBe(false);
    expect(isPaymentBlocked('pending')).toBe(true);
    expect(isPaymentBlocked('unverified')).toBe(true);
    expect(isPaymentBlocked('info_required')).toBe(true);
    expect(isPaymentBlocked('rejected')).toBe(true);
    expect(isPaymentBlocked(null)).toBe(true);
    expect(isPaymentBlocked(undefined)).toBe(true);
  });
});

describe('needsVerificationPrompt', () => {
  it('prompts when no dossier or when it must be (re)completed', () => {
    expect(needsVerificationPrompt(null)).toBe(true);
    expect(needsVerificationPrompt('unverified')).toBe(true);
    expect(needsVerificationPrompt('info_required')).toBe(true);
  });
  it('does not prompt once submitted or verified', () => {
    expect(needsVerificationPrompt('pending')).toBe(false);
    expect(needsVerificationPrompt('verified')).toBe(false);
    expect(needsVerificationPrompt('rejected')).toBe(false);
  });
});

describe('maskIban', () => {
  it('keeps only the last four characters, ignoring spaces', () => {
    expect(maskIban('FR76 3000 1007 1234 5678 90')).toBe('•••• 7890');
    expect(maskIban('12')).toBe('12');
  });
});

describe('isPlausibleIban', () => {
  it('accepts a plausible IBAN and rejects junk', () => {
    expect(isPlausibleIban('FR7630001007123456789012345')).toBe(true);
    expect(isPlausibleIban('fr76 3000 1007 1234 5678 901')).toBe(true);
    expect(isPlausibleIban('hello')).toBe(false);
    expect(isPlausibleIban('123456')).toBe(false);
  });
});
