import cron from 'node-cron';
import { offerLettersService } from './offer-letters.service';

/**
 * Daily cron job running at midnight Asia/Kolkata (18:30 UTC)
 * - Expire offer letters past offer_valid_until
 * - Activate employees on their joining date from Onboarding to Active/Probation
 */
export const startOfferLettersCron = () => {
  // Midnight IST (18:30 UTC)
  cron.schedule('30 18 * * *', async () => {
    try {
      const expiredCount = await offerLettersService.expireStaleOffers();
      if (expiredCount > 0) {
        console.log(`[Offer Letters Cron] Expired ${expiredCount} past-due offer letter(s)`);
      }

      const activatedCount = await offerLettersService.activateOnboardingEmployees();
      if (activatedCount > 0) {
        console.log(`[Offer Letters Cron] Activated ${activatedCount} onboarding employee(s) on joining date`);
      }
    } catch (err) {
      console.error('[Offer Letters Cron] Error running daily jobs:', err);
    }
  });
};

export const initOfferLettersCron = startOfferLettersCron;
