import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";

const TermsAndConditions = () => {
  return (
    <div className="poolito-page min-h-screen font-copy">
      <Navbar />
      <PageHero
        eyebrow="Legal"
        title="Terms and Conditions for InitOption Trading Platform"
        description="Last Updated: May 17, 2026"
      />
      <main className="max-w-4xl mx-auto p-6">

        <section className="bg-gray-50 rounded-lg p-8 space-y-6 border border-gray-200">
          <p>Last Updated: May 17, 2026</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">1. Introduction</h2>
          <p>
            Welcome to InitOption (the "Platform", "we", "us", or "our"). These Terms and Conditions ("Terms")
            govern your access to and use of our binary options trading platform, website, and related services
            (collectively, the "Service").
          </p>
          <p>
            By registering, accessing, or using our Service, you acknowledge that you have read, understood,
            and agree to be bound by these Terms. If you do not agree, please do not use our Service.
          </p>

          <h2 className="font-display text-2xl font-bold text-gray-900">2. Eligibility</h2>
          <p>You may only use our Service if:</p>
          <ol className="list-decimal list-inside">
            <li>You are at least 18 years of age (or the legal age of majority in your jurisdiction)</li>
            <li>You have the full legal capacity to enter into binding agreements</li>
            <li>Binary options trading is legal in your country of residence</li>
            <li>You are not located in a restricted jurisdiction (see Section 16)</li>
            <li>You are not using the Service on behalf of any third party</li>
          </ol>
          <p>We reserve the right to verify your identity and age at any time.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">3. Account Registration</h2>
          <p>To trade on InitOption, you must create an account by providing:</p>
          <ol className="list-decimal list-inside">
            <li>Valid email address</li>
            <li>Username</li>
            <li>Password</li>
            <li>Full legal name</li>
            <li>Date of birth</li>
            <li>Country of residence</li>
            <li>Phone number (optional)</li>
          </ol>
          <p>You agree to:</p>
          <ol className="list-decimal list-inside">
            <li>Provide accurate, current, and complete information</li>
            <li>Update your information promptly when changes occur</li>
            <li>Maintain the confidentiality of your login credentials</li>
            <li>Notify us immediately of any unauthorized account access</li>
            <li>Accept full responsibility for all activities under your account</li>
          </ol>
          <p>We reserve the right to suspend or terminate any account that violates these Terms.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">4. Trading on InitOption</h2>
          <h3 className="font-display text-xl font-bold text-gray-900">4.1 Binary Options</h3>
          <p>Our platform offers binary options trading, where you predict whether the price of an asset will be higher or lower at a specified expiration time.</p>
          <h3 className="font-display text-xl font-bold text-gray-900">4.2 How Trades Work</h3>
          <p>You select an asset (e.g., EUR/USD, BTC/USD)</p>
          <p>You choose a direction: CALL (UP) or PUT (DOWN)</p>
          <p>You select an investment amount</p>
          <p>You choose an expiry time (e.g., 1 minute, 5 minutes, 1 hour)</p>
          <p>If your prediction is correct at expiry, you receive a payout (up to 90% of your investment)</p>
          <p>If your prediction is incorrect, you lose your investment</p>
          <h3 className="font-display text-xl font-bold text-gray-900">4.3 Payout Rates</h3>
          <p>Payout percentages vary by asset, expiry time, and market conditions. The applicable payout rate is displayed before you confirm each trade.</p>
          <h3 className="font-display text-xl font-bold text-gray-900">4.4 No Guarantees</h3>
          <p>Past performance does not guarantee future results. Binary options trading involves substantial risk of loss. You should never invest money you cannot afford to lose.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">5. Deposits and Withdrawals</h2>
          <h3 className="font-display text-xl font-bold text-gray-900">5.1 Deposits</h3>
          <p>Minimum deposit: $10 USD (or equivalent)</p>
          <p>Deposits can be made via: Credit Card, Crypto, E-wallets, Bank Transfer</p>
          <p>Deposits are credited to your trading account immediately upon confirmation</p>
          <p>We do not charge deposit fees, but your payment provider may</p>
          <h3 className="font-display text-xl font-bold text-gray-900">5.2 Withdrawals</h3>
          <p>Minimum withdrawal: $50 USD</p>
          <p>Maximum withdrawal: $10,000 per transaction (subject to change)</p>
          <p>Withdrawal requests are processed within 1-3 business days</p>
          <p>You may be required to verify your identity before your first withdrawal</p>
          <p>Withdrawals must be made to the same payment method used for deposits (where possible)</p>
          <h3 className="font-display text-xl font-bold text-gray-900">5.3 Fees</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="pb-2">Fee Type</th>
                <th className="pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1">Deposit Fee</td>
                <td className="py-1">$0 (free)</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">Withdrawal Fee</td>
                <td className="py-1">$5 or 2% (whichever is higher)</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">Inactivity Fee</td>
                <td className="py-1">$10 per month after 90 days of inactivity</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">Currency Conversion</td>
                <td className="py-1">1.5% (if applicable)</td>
              </tr>
            </tbody>
          </table>
          <h3 className="font-display text-xl font-bold text-gray-900">5.4 Refund Policy</h3>
          <p>All trades are final and irreversible. Once a trade is placed, it cannot be canceled, modified, or refunded. Deposits are non-refundable unless required by applicable law.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">6. Demo Account</h2>
          <p>We offer a demo account with virtual funds (typically $10,000) for practice purposes.</p>
          <p>Demo trades do not involve real money</p>
          <p>Demo account performance does not guarantee live account results</p>
          <p>We reserve the right to reset or modify demo account balances at any time</p>
          <p>Demo accounts may expire after 30 days of inactivity</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">7. Bonuses and Promotions</h2>
          <h3 className="font-display text-xl font-bold text-gray-900">7.1 Bonus Terms</h3>
          <p>Any bonus offered is subject to specific terms disclosed at the time of promotion. General bonus conditions include:</p>
          <ol className="list-decimal list-inside">
            <li>Bonuses are credited to your bonus balance, not withdrawable cash</li>
            <li>You must trade a minimum volume to convert bonus to withdrawable funds</li>
            <li>Typical trading requirement: 30x to 50x the bonus amount</li>
            <li>Withdrawing funds before meeting requirements forfeits the bonus</li>
          </ol>
          <h3 className="font-display text-xl font-bold text-gray-900">7.2 Abuse and Prohibited Practices</h3>
          <p>The following are strictly prohibited and will result in account termination, confiscation of funds, and forfeiture of bonuses:</p>
          <ol className="list-decimal list-inside">
            <li>Arbitrage trading</li>
            <li>Latency arbitrage</li>
            <li>Multiple accounts to claim bonuses</li>
            <li>Hedging strategies designed to exploit promotions</li>
            <li>Any form of market manipulation</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">8. Platform Availability and Technical Issues</h2>
          <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted service</p>
          <p>Scheduled maintenance will be announced in advance when possible</p>
          <p>We are not responsible for losses caused by:</p>
          <ol className="list-decimal list-inside">
            <li>Internet connectivity issues</li>
            <li>Power outages</li>
            <li>Browser or device malfunctions</li>
            <li>Third-party service disruptions</li>
            <li>Force majeure events</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">9. Prohibited Activities</h2>
          <p>You agree NOT to:</p>
          <ol className="list-decimal list-inside">
            <li>Use the Service for any illegal purpose</li>
            <li>Manipulate prices or engage in fraudulent trading</li>
            <li>Create multiple accounts to bypass limits or claim bonuses</li>
            <li>Use automated trading bots or scripts without written permission</li>
            <li>Reverse engineer, decompile, or copy any part of our platform</li>
            <li>Share your account credentials with others</li>
            <li>Attempt to hack, disrupt, or overload our servers</li>
            <li>Use the Service in any jurisdiction where binary options are prohibited</li>
          </ol>
          <p>Violation of this section may result in immediate account termination and forfeiture of all funds.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">10. Risk Disclosure</h2>
          <p><strong>WARNING: BINARY OPTIONS TRADING CARRIES SIGNIFICANT FINANCIAL RISK.</strong></p>
          <p>By using InitOption, you acknowledge and agree that:</p>
          <ol className="list-decimal list-inside">
            <li>You understand binary options trading is speculative and high-risk</li>
            <li>You may lose all of your invested capital</li>
            <li>You should never trade with money you cannot afford to lose</li>
            <li>No trading strategy guarantees profits</li>
            <li>Past profits do not predict future results</li>
            <li>You are solely responsible for your trading decisions</li>
            <li>We do not provide financial advice</li>
          </ol>
          <p>We strongly recommend that you:</p>
          <ol className="list-decimal list-inside">
            <li>Trade only with a demo account until you understand the risks</li>
            <li>Never risk more than 1-2% of your account on a single trade</li>
            <li>Seek independent financial advice if unsure</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">11. Intellectual Property</h2>
          <p>All content on the InitOption platform, including but not limited to:</p>
          <ol className="list-decimal list-inside">
            <li>Software and source code</li>
            <li>Charts and trading tools</li>
            <li>Graphics, logos, and icons</li>
            <li>Text and documentation</li>
            <li>Trademarks and trade names</li>
          </ol>
          <p>is owned by InitOption or our licensors and is protected by copyright, trademark, and other intellectual property laws.</p>
          <p>You may not copy, modify, distribute, or create derivative works without our explicit written consent.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">12. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law:</p>
          <ol className="list-decimal list-inside">
            <li>InitOption is not liable for any indirect, incidental, or consequential damages</li>
            <li>Our total liability shall not exceed the amount you have deposited in the previous 30 days</li>
            <li>We are not responsible for any trading losses you incur</li>
            <li>We do not guarantee any specific trading results</li>
            <li>You assume full responsibility for all trading decisions and outcomes.</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">13. Indemnification</h2>
          <p>You agree to indemnify and hold InitOption, its officers, directors, employees, and affiliates harmless from any claims, damages, losses, liabilities, costs, or expenses (including legal fees) arising from:</p>
          <ol className="list-decimal list-inside">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any applicable laws or regulations</li>
            <li>Your infringement of any third-party rights</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">14. Account Suspension and Termination</h2>
          <h3 className="font-display text-xl font-bold text-gray-900">14.1 By Us</h3>
          <p>We may suspend or terminate your account immediately if:</p>
          <ol className="list-decimal list-inside">
            <li>You violate any provision of these Terms</li>
            <li>We suspect fraudulent or illegal activity</li>
            <li>Required by law or regulatory authority</li>
            <li>You become insolvent or file for bankruptcy</li>
          </ol>
          <h3 className="font-display text-xl font-bold text-gray-900">14.2 By You</h3>
          <p>You may close your account at any time by:</p>
          <ol className="list-decimal list-inside">
            <li>Withdrawing all available funds</li>
            <li>Contacting support at support@initoption.com</li>
            <li>Completing the account closure process</li>
          </ol>
          <h3 className="font-display text-xl font-bold text-gray-900">14.3 Effect of Termination</h3>
          <p>Upon termination:</p>
          <ol className="list-decimal list-inside">
            <li>All open trades will be closed at current market value</li>
            <li>Remaining funds will be returned (less any applicable fees)</li>
            <li>Your access to the platform will be revoked</li>
            <li>Bonuses will be forfeited</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">15. Privacy and Data Protection</h2>
          <p>Your privacy is important to us. Please review our Privacy Policy, which explains:</p>
          <ol className="list-decimal list-inside">
            <li>What personal data we collect</li>
            <li>How we use and protect your data</li>
            <li>Your rights regarding your data</li>
            <li>How we comply with GDPR and other data protection laws</li>
          </ol>
          <p>By using our Service, you consent to our data practices as described in the Privacy Policy.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">16. Restricted Jurisdictions</h2>
          <p>Binary options trading is illegal or restricted in certain countries. You are responsible for ensuring that your use of InitOption complies with local laws.</p>
          <p>We do not accept clients from the following countries:</p>
          <ol className="list-decimal list-inside">
            <li>United States (including all territories)</li>
            <li>Canada</li>
            <li>European Union (certain member states)</li>
            <li>Australia</li>
            <li>Japan</li>
            <li>Israel</li>
          </ol>
          <p>[Add other restricted jurisdictions]</p>
          <p>We reserve the right to block access from any jurisdiction at our sole discretion.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">17. Amendments to Terms</h2>
          <p>We may update these Terms from time to time. Material changes will be notified by:</p>
          <ol className="list-decimal list-inside">
            <li>Email to your registered address</li>
            <li>In-app notification</li>
            <li>Notice on our website</li>
          </ol>
          <p>Continued use of the Service after changes constitute acceptance of the new Terms.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900">18. Governing Law and Dispute Resolution</h2>
          <h3 className="font-display text-xl font-bold text-gray-900">18.1 Governing Law</h3>
          <p>These Terms shall be governed by and construed in accordance with the laws of [Your Country/State], without regard to conflict of law principles.</p>
          <h3 className="font-display text-xl font-bold text-gray-900">18.2 Dispute Resolution</h3>
          <p>Any dispute arising from these Terms or your use of the Service shall be resolved as follows:</p>
          <ol className="list-decimal list-inside">
            <li>Informal Resolution: You agree to contact our support team first to attempt to resolve the dispute amicably.</li>
            <li>Arbitration: If the dispute cannot be resolved informally within 30 days, it shall be resolved through binding arbitration in accordance with the rules of [Arbitration Body].</li>
            <li>Class Action Waiver: You agree to bring any claims against us individually and not as part of any class action.</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">19. Contact Information</h2>
          <p>For questions, concerns, or support requests, please contact us at:</p>
          <ol className="list-decimal list-inside">
            <li>InitOption Support Team</li>
            <li>Email: support@initoption.com</li>
            <li>Live Chat: Available on our platform 24/7</li>
            <li>Response Time: Within 24 hours</li>
          </ol>
          <ol className="list-decimal list-inside">
            <li>Complaints Department</li>
            <li>Email: complaints@initoption.com</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">20. Acknowledgment</h2>
          <p>BY REGISTERING FOR AN ACCOUNT OR USING OUR SERVICE, YOU ACKNOWLEDGE THAT:</p>
          <ol className="list-decimal list-inside">
            <li>You have read and understood these Terms</li>
            <li>You agree to be bound by them</li>
            <li>You accept the risks associated with binary options trading</li>
            <li>You are solely responsible for your trading decisions</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900">21. Entire Agreement</h2>
          <p>These Terms, together with our Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and InitOption regarding the Service and supersede all prior agreements.</p>

          <p className="font-display text-xl font-bold text-gray-900 text-center mt-8">
            INITOPTION – TRADE RESPONSIBLY
          </p>

          <p className="text-center mt-4">
            If you or someone you know shows signs of problem gambling or trading addiction, please seek help immediately. Contact [Gambling Helpline] for support.
          </p>
        </section>

        <div className="mt-8">
          <Link to="/" className="text-white underline">
            Return to homepage
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsAndConditions;
