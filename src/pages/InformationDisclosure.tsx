import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";

const InformationDisclosure = () => {
  return (
    <div className="min-h-screen bg-white font-copy text-gray-700">
      <Navbar />
      <PageHero
        eyebrow="Policy"
        title="Information Disclosure Policy"
        description="Last Updated: 9 June 2026 — Version 2.0 — Applicable to: All users, employees, contractors, and third parties interacting with Init Option"
      />
      <main className="max-w-4xl mx-auto p-6">

        <section className="bg-gray-50 rounded-lg p-8 space-y-6 border border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Last Updated:</strong> 9 June 2026<br />
            <strong>Version:</strong> 2.0<br />
            <strong>Applicable to:</strong> All users, employees, contractors, and third parties interacting with Init Option
          </p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">TABLE OF CONTENTS</h2>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Introduction and Purpose</li>
            <li>Scope of Policy</li>
            <li>Types of Information Covered</li>
            <li>Principles of Information Disclosure</li>
            <li>When We Disclose Information</li>
            <li>When We Do Not Disclose Information</li>
            <li>Disclosure to Government and Regulatory Authorities</li>
            <li>Disclosure in Legal Proceedings</li>
            <li>Disclosure to Third-Party Service Providers</li>
            <li>Disclosure with User Consent</li>
            <li>Public Information</li>
            <li>Anonymised and Aggregated Data</li>
            <li>User Access to Their Own Information</li>
            <li>User Rights Regarding Information Disclosure</li>
            <li>Employee and Contractor Confidentiality Obligations</li>
            <li>Data Breach Notification</li>
            <li>Cross-Border Data Transfers</li>
            <li>Information Security Measures</li>
            <li>Prohibited Disclosures</li>
            <li>Consequences of Unauthorised Disclosure</li>
            <li>Reporting Violations</li>
            <li>Policy Updates</li>
            <li>Contact Information</li>
          </ol>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">1. INTRODUCTION AND PURPOSE</h2>
          <p>
            Init Option ("the Company", "we", "us", "our") is committed to protecting the confidentiality, integrity, and privacy of all information entrusted to us. This Information Disclosure Policy (the "Policy") outlines our principles, practices, and legal obligations regarding the disclosure of information we collect, store, and process.
          </p>
          <p>The purpose of this Policy is to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Protect user privacy and confidentiality</li>
            <li>Comply with applicable data protection laws and regulations</li>
            <li>Establish clear guidelines for when and how information may be disclosed</li>
            <li>Prevent unauthorised or accidental disclosure of sensitive information</li>
            <li>Build and maintain trust with our users</li>
          </ul>
          <p>All users, employees, contractors, and third parties interacting with Init Option must adhere to this Policy.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">2. SCOPE OF POLICY</h2>
          <p>This Policy applies to:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white w-32">Personal Information</td>
                  <td className="p-2">Any data relating to an identified or identifiable natural person (e.g., name, email, phone number, address, ID documents)</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Financial Information</td>
                  <td className="p-2">Transaction records, deposit and withdrawal history, trading activity, balances, payment method details</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Technical Information</td>
                  <td className="p-2">IP addresses, device identifiers, browser data, login timestamps, session data</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Communications</td>
                  <td className="p-2">Support tickets, live chat transcripts, email correspondence, feedback, survey responses</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">KYC and AML Data</td>
                  <td className="p-2">Identity documents, proof of address, source of funds information, verification status</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Account Information</td>
                  <td className="p-2">Usernames, passwords (hashed), security settings, two-factor authentication data</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Proprietary Information</td>
                  <td className="p-2">Trading algorithms, platform code, business strategies, internal policies</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">This Policy applies regardless of how information is stored (electronic, physical, or verbal) and regardless of where it is located (servers, databases, paper records, employee devices).</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">3. TYPES OF INFORMATION COVERED</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">3.1 Confidential Information</h3>
          <p>Confidential information is any information that is not publicly available and is protected from unauthorised disclosure. This includes:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white w-24">User personal data</td>
                  <td className="p-2">Name, email, phone number, address, date of birth</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">KYC documents</td>
                  <td className="p-2">Passport images, ID cards, utility bills, selfies</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Financial data</td>
                  <td className="p-2">Bank account details, crypto wallet addresses, transaction history</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Trading data</td>
                  <td className="p-2">Trade amounts, directions, expiry times, win/loss records</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Security data</td>
                  <td className="p-2">Password hashes, 2FA secrets, security question answers</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Internal data</td>
                  <td className="p-2">Employee information, business strategies, source code</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">3.2 Public Information</h3>
          <p>Public information is information that is intentionally made available to the general public. This includes:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white w-32">Marketing content</td>
                  <td className="p-2">Website copy, blog posts, social media content</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Public policies</td>
                  <td className="p-2">Terms and Conditions, Privacy Policy, AML Policy</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Public statements</td>
                  <td className="p-2">Press releases, official announcements</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Aggregated statistics</td>
                  <td className="p-2">Anonymous platform statistics (e.g., "5,000 active traders")</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">3.3 Anonymised Information</h3>
          <p>Anonymised information is data that has been processed to remove all identifying information so that it cannot be linked back to a specific individual. Anonymised information is not subject to the same restrictions as confidential information.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">4. PRINCIPLES OF INFORMATION DISCLOSURE</h2>
          <p>We adhere to the following principles when disclosing information:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white w-28">Lawfulness</td>
                  <td className="p-2">Disclosure is only made when permitted or required by law</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Transparency</td>
                  <td className="p-2">Users are informed about how and why their information is disclosed</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Minimisation</td>
                  <td className="p-2">Only the minimum necessary information is disclosed for the specific purpose</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Accountability</td>
                  <td className="p-2">We document all disclosures and can justify them if questioned</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Security</td>
                  <td className="p-2">Information is disclosed using secure channels and methods</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Consent</td>
                  <td className="p-2">Where required, we obtain explicit user consent before disclosure</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Limited purpose</td>
                  <td className="p-2">Information disclosed for one purpose cannot be used for another purpose</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">5. WHEN WE DISCLOSE INFORMATION</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">5.1 Disclosure with User Consent</h3>
          <p>We may disclose information when we have obtained explicit, informed consent from the user. Consent must be:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Freely given (no coercion)</li>
            <li>Specific (clearly states what information and to whom)</li>
            <li>Informed (user understands the purpose)</li>
            <li>Unambiguous (clear affirmative action)</li>
          </ul>
          <p className="mt-4"><strong>Examples of consent-based disclosure:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sharing KYC documents with a third-party verification provider</li>
            <li>Sharing trading statistics with a social trading feature</li>
            <li>Sharing email address for a newsletter or promotion</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">5.2 Disclosure to Third-Party Service Providers</h3>
          <p>We may disclose information to trusted third-party service providers who assist us in operating the platform. These providers are contractually obligated to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use information only for the specified purpose</li>
            <li>Maintain confidentiality and security</li>
            <li>Not retain information longer than necessary</li>
            <li>Comply with applicable data protection laws</li>
          </ul>
          <p className="mt-4"><strong>Categories of third-party providers:</strong></p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-slate-800">
                  <th className="border-r border-gray-300 p-2">Provider Type</th>
                  <th className="border-r border-gray-300 p-2">Information Shared</th>
                  <th className="border-r border-gray-300 p-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Payment processors (SasaPay, Plisio)</td>
                  <td className="border-r border-gray-300 p-2">Phone number, amount, transaction reference</td>
                  <td className="p-2">Process deposits and withdrawals</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">KYC verification providers (Sumsub, Onfido)</td>
                  <td className="border-r border-gray-300 p-2">ID documents, selfies, proof of address</td>
                  <td className="p-2">Verify user identity</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Cloud hosting (AWS, DigitalOcean)</td>
                  <td className="border-r border-gray-300 p-2">All platform data</td>
                  <td className="p-2">Store and process data</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2">Customer support software</td>
                  <td className="border-r border-gray-300 p-2">Support tickets, chat transcripts</td>
                  <td className="p-2">Provide customer service</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">5.3 Disclosure Required by Law</h3>
          <p>We may disclose information when required by applicable law, regulation, or legal process. This includes:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white w-28">Court orders</td>
                  <td className="p-2">Subpoena, search warrant, court judgment</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Regulatory requests</td>
                  <td className="p-2">Financial Reporting Centre (FRC) request, tax authority inquiry</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Law enforcement</td>
                  <td className="p-2">Police investigation, criminal proceeding</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Anti-money laundering</td>
                  <td className="p-2">Suspicious Activity Report (SAR) filing</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Tax reporting</td>
                  <td className="p-2">Information to Kenya Revenue Authority (KRA)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">5.4 Disclosure to Protect Legal Rights</h3>
          <p>We may disclose information when necessary to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Protect our rights, property, or safety</li>
            <li>Prevent fraud or illegal activity</li>
            <li>Enforce our Terms and Conditions</li>
            <li>Defend against legal claims</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">5.5 Disclosure in Business Transfers</h3>
          <p>In the event of a merger, acquisition, bankruptcy, or sale of assets, user information may be transferred to the successor entity. We will notify affected users before any such transfer.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">5.6 Disclosure for Security and Fraud Prevention</h3>
          <p>We may disclose information to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Investigate and prevent fraud</li>
            <li>Respond to security incidents</li>
            <li>Protect the integrity of the platform</li>
            <li>Cooperate with security researchers</li>
          </ul>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">6. WHEN WE DO NOT DISCLOSE INFORMATION</h2>
          <p>We do <strong>not</strong> disclose information in the following circumstances:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">For marketing purposes</td>
                  <td className="p-2">We do not sell or rent user information to third parties for marketing</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">To unverified third parties</td>
                  <td className="p-2">We only share with verified, contractually bound providers</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">For non-specific purposes</td>
                  <td className="p-2">Disclosure requires a specific, stated purpose</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Beyond user consent</td>
                  <td className="p-2">We do not exceed the scope of consent given</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">To countries without adequate protection</td>
                  <td className="p-2">We ensure adequate safeguards for cross-border transfers</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">To circumvent legal requirements</td>
                  <td className="p-2">We do not bypass disclosure laws or restrictions</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">7. DISCLOSURE TO GOVERNMENT AND REGULATORY AUTHORITIES</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">7.1 Kenya</h3>
          <p>We cooperate with Kenyan government and regulatory authorities, including:</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-slate-800">
                  <th className="border-r border-gray-300 p-2">Authority</th>
                  <th className="border-r border-gray-300 p-2">Jurisdiction</th>
                  <th className="border-r border-gray-300 p-2">Information Disclosed</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Financial Reporting Centre (FRC)</td>
                  <td className="border-r border-gray-300 p-2">AML compliance</td>
                  <td className="p-2">Suspicious Activity Reports (SARs), transaction data</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Kenya Revenue Authority (KRA)</td>
                  <td className="border-r border-gray-300 p-2">Tax compliance</td>
                  <td className="p-2">Withdrawal records, trading income</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Directorate of Criminal Investigations (DCI)</td>
                  <td className="border-r border-gray-300 p-2">Criminal investigations</td>
                  <td className="p-2">Account data, transaction history</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Office of the Data Protection Commissioner (ODPC)</td>
                  <td className="border-r border-gray-300 p-2">Data protection</td>
                  <td className="p-2">Data breach notifications, compliance information</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Capital Markets Authority (CMA)</td>
                  <td className="border-r border-gray-300 p-2">Financial services</td>
                  <td className="p-2">As required by law</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">7.2 International Authorities</h3>
          <p>We may disclose information to international authorities when:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Required by international treaty or agreement</li>
            <li>Requested through Mutual Legal Assistance (MLA) channels</li>
            <li>Required by sanctions monitoring (UN, EU, US OFAC)</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">7.3 Procedures for Government Requests</h3>
          <p>All government and regulatory requests for information must:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Be in writing (email or physical letter)</li>
            <li>Identify the specific legal authority for the request</li>
            <li>Clearly describe the information requested</li>
            <li>Be directed to our Compliance Officer</li>
            <li>Be subject to legal review before disclosure</li>
          </ol>
          <p className="mt-4">We will notify affected users of government requests unless prohibited by law.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">8. DISCLOSURE IN LEGAL PROCEEDINGS</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">8.1 Court Orders and Subpoenas</h3>
          <p>We comply with valid court orders and subpoenas issued by courts with proper jurisdiction. Before disclosing information:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>We verify the authenticity of the court order</li>
            <li>We notify the affected user (unless prohibited)</li>
            <li>We limit disclosure to the information specifically requested</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">8.2 Civil Litigation</h3>
          <p>In civil legal proceedings, we may disclose information when:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>We are a party to the litigation</li>
            <li>We are required by a court order</li>
            <li>A user consents to disclosure</li>
            <li>Necessary to defend against a claim</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">8.3 Arbitration</h3>
          <p>In arbitration proceedings, we may disclose information as required by arbitration rules or ordered by the arbitrator.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">9. DISCLOSURE TO THIRD-PARTY SERVICE PROVIDERS</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">9.1 Criteria for Third-Party Disclosure</h3>
          <p>Before disclosing information to a third-party service provider, we ensure that:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Legitimate need</td>
                  <td className="p-2">Provider needs the information to perform their service</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Contractual safeguards</td>
                  <td className="p-2">Written agreement includes data protection obligations</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Security standards</td>
                  <td className="p-2">Provider meets minimum security requirements</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Data minimisation</td>
                  <td className="p-2">Only necessary information is shared</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Retention limits</td>
                  <td className="p-2">Provider must delete information after purpose is fulfilled</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Sub-processing control</td>
                  <td className="p-2">Provider cannot share with sub-processors without approval</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">9.2 Current Third-Party Providers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <thead>
                <tr className="bg-slate-800">
                  <th className="border-r border-gray-300 p-2">Provider</th>
                  <th className="border-r border-gray-300 p-2">Information Disclosed</th>
                  <th className="border-r border-gray-300 p-2">Purpose</th>
                  <th className="border-r border-gray-300 p-2">Data Location</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">SasaPay</td>
                  <td className="border-r border-gray-300 p-2">Phone number, amount, transaction reference</td>
                  <td className="border-r border-gray-300 p-2">M-PESA payments</td>
                  <td className="p-2">Kenya</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Plisio</td>
                  <td className="border-r border-gray-300 p-2">Crypto wallet address, amount, transaction hash</td>
                  <td className="border-r border-gray-300 p-2">Crypto payments</td>
                  <td className="p-2">EU</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Sumsub</td>
                  <td className="border-r border-gray-300 p-2">ID documents, selfies, proof of address</td>
                  <td className="border-r border-gray-300 p-2">KYC verification</td>
                  <td className="p-2">EU</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Amazon Web Services (AWS)</td>
                  <td className="border-r border-gray-300 p-2">All platform data</td>
                  <td className="border-r border-gray-300 p-2">Cloud hosting</td>
                  <td className="p-2">Kenya, Ireland, USA</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">DigitalOcean</td>
                  <td className="border-r border-gray-300 p-2">Backups</td>
                  <td className="border-r border-gray-300 p-2">Data backups</td>
                  <td className="p-2">USA</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2">Google Analytics</td>
                  <td className="border-r border-gray-300 p-2">Anonymous usage data</td>
                  <td className="border-r border-gray-300 p-2">Analytics</td>
                  <td className="p-2">Global</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">9.3 Sub-Processors</h3>
          <p>Third-party providers may use sub-processors. We maintain a list of all sub-processors and require the same data protection standards.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">10. DISCLOSURE WITH USER CONSENT</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">10.1 Obtaining Consent</h3>
          <p>We obtain user consent for disclosure when:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The disclosure is not otherwise permitted by law</li>
            <li>The disclosure is for a new purpose not covered by this Policy</li>
            <li>The disclosure involves sensitive information</li>
            <li>The user has a right to opt out</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">10.2 Withdrawal of Consent</h3>
          <p>Users may withdraw consent at any time by contacting <strong>privacy@initoption.com</strong>. Withdrawal of consent does not affect disclosures already made before withdrawal.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">10.3 Examples of Consent-Based Disclosure</h3>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-slate-800">
                  <th className="border-r border-gray-300 p-2">Disclosure</th>
                  <th className="border-r border-gray-300 p-2">Consent Required?</th>
                  <th className="border-r border-gray-300 p-2">How Consent is Obtained</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Marketing emails</td>
                  <td className="border-r border-gray-300 p-2">Yes</td>
                  <td className="p-2">Opt-in checkbox</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Social trading (share trading activity)</td>
                  <td className="border-r border-gray-300 p-2">Yes</td>
                  <td className="p-2">Opt-in toggle</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">Referral program participation</td>
                  <td className="border-r border-gray-300 p-2">Yes</td>
                  <td className="p-2">Acceptance of terms</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2">KYC verification</td>
                  <td className="border-r border-gray-300 p-2">Yes</td>
                  <td className="p-2">By submitting documents</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">11. PUBLIC INFORMATION</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">11.1 Information Intentionally Made Public</h3>
          <p>Certain information is intentionally made public, including:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Website content and marketing materials</li>
            <li>Public policies (Terms, Privacy Policy, AML Policy)</li>
            <li>Public announcements and press releases</li>
            <li>Aggregated platform statistics (e.g., "over 5,000 active traders")</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">11.2 User-Generated Public Content</h3>
          <p>Users may choose to make certain information public through platform features, such as:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tournament leaderboard names (displayed as usernames or nicknames)</li>
            <li>Chat messages (visible to other users)</li>
            <li>Public profile information (if user opts in)</li>
          </ul>
          <p className="mt-4">Users are advised not to share sensitive personal information in public areas.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">12. ANONYMISED AND AGGREGATED DATA</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">12.1 Anonymisation Process</h3>
          <p>We may anonymise personal data by removing all identifying information so that it cannot be linked back to a specific individual. Anonymised data is not subject to this Policy's restrictions.</p>
          <p className="mt-4"><strong>Examples of anonymisation:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Removing names, emails, phone numbers</li>
            <li>Aggregating data into summary statistics</li>
            <li>Rounding or generalising specific values</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">12.2 Aggregated Data</h3>
          <p>We may create aggregated data sets that combine information from multiple users. Aggregated data does not identify individual users and may be used for:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Platform analytics and improvement</li>
            <li>Marketing and business intelligence</li>
            <li>Academic or industry research</li>
            <li>Public reporting (e.g., "average win rate 67%")</li>
          </ul>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">13. USER ACCESS TO THEIR OWN INFORMATION</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">13.1 Right to Access</h3>
          <p>Users have the right to request access to the personal information we hold about them. This includes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>A copy of all personal data</li>
            <li>Information about how it is used</li>
            <li>Information about who it has been shared with</li>
            <li>Information about retention periods</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">13.2 How to Request Access</h3>
          <p>Users may request access by:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Submitting a request to <strong>privacy@initoption.com</strong></li>
            <li>Providing proof of identity</li>
            <li>Specifying the information requested</li>
          </ol>
          <p className="mt-4">We will respond within 30 days.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">13.3 Limitations on Access</h3>
          <p>Access may be limited when:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The information contains references to other individuals</li>
            <li>Disclosure would compromise security</li>
            <li>Disclosure is prohibited by law</li>
            <li>The request is manifestly unfounded or excessive</li>
          </ul>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">14. USER RIGHTS REGARDING INFORMATION DISCLOSURE</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.1 Right to be Informed</h3>
          <p>Users have the right to be informed about:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>What information we collect</li>
            <li>How we use it</li>
            <li>Who we share it with</li>
            <li>How long we keep it</li>
            <li>Their rights regarding their information</li>
          </ul>
          <p className="mt-4">This Policy serves as that notification.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.2 Right to Rectification</h3>
          <p>Users have the right to correct inaccurate or incomplete information.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.3 Right to Erasure (Right to be Forgotten)</h3>
          <p>Users may request deletion of their personal information, subject to legal retention requirements (e.g., AML records must be kept for 7 years).</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.4 Right to Restrict Processing</h3>
          <p>Users may request that we limit how we use their information while disputes are resolved.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.5 Right to Data Portability</h3>
          <p>Users may request a copy of their information in a machine-readable format (JSON, CSV).</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.6 Right to Object</h3>
          <p>Users may object to certain types of processing, including marketing and non-essential analytics.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">14.7 How to Exercise Rights</h3>
          <p>Contact <strong>privacy@initoption.com</strong>. We will respond within 30 days.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">15. EMPLOYEE AND CONTRACTOR CONFIDENTIALITY OBLIGATIONS</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">15.1 Confidentiality Agreements</h3>
          <p>All employees, contractors, and interns must sign a confidentiality agreement before accessing any user information. The agreement covers:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Prohibition on unauthorised disclosure</li>
            <li>Secure handling of information</li>
            <li>Reporting of breaches</li>
            <li>Consequences of violation</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">15.2 Access Controls</h3>
          <p>Access to user information is granted on a need-to-know basis only. Employees may access only the information necessary for their job functions.</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm border-collapse border border-gray-300">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Customer support</td>
                  <td className="p-2">Basic user information, support tickets, transaction history</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Compliance team</td>
                  <td className="p-2">Full KYC/AML data, transaction monitoring</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Finance team</td>
                  <td className="p-2">Payment and withdrawal data</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Developers</td>
                  <td className="p-2">Technical data (no personally identifiable information in development environments)</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Senior management</td>
                  <td className="p-2">Oversight access (audited)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">15.3 Prohibited Conduct</h3>
          <p>Employees and contractors are prohibited from:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Accessing user information out of curiosity</li>
            <li>Sharing information with unauthorised colleagues</li>
            <li>Taking information offsite without approval</li>
            <li>Discussing user information in public areas</li>
            <li>Using user information for personal purposes</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">15.4 Training</h3>
          <p>All employees receive annual training on information disclosure and confidentiality obligations.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">16. DATA BREACH NOTIFICATION</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">16.1 Definition of Data Breach</h3>
          <p>A data breach is any unauthorised access, acquisition, disclosure, modification, or destruction of personal information.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">16.2 Internal Reporting</h3>
          <p>All employees must report suspected data breaches immediately to <strong>security@initoption.com</strong>. Reports are investigated within 24 hours.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">16.3 Notification to Authorities</h3>
          <p>We notify the Office of the Data Protection Commissioner (ODPC) within 48 hours of confirming a data breach where there is a risk to user rights and freedoms.</p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">16.4 Notification to Affected Users</h3>
          <p>We notify affected users within 72 hours of confirming a data breach, unless:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The breach is unlikely to result in a risk to user rights</li>
            <li>The data was encrypted or anonymised</li>
            <li>Notification would impede a criminal investigation</li>
          </ul>
          <p className="mt-4">Notifications include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Description of the breach</li>
            <li>Information potentially compromised</li>
            <li>Steps taken to mitigate</li>
            <li>Contact information for further inquiries</li>
          </ul>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">17. CROSS-BORDER DATA TRANSFERS</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">17.1 Countries Where Data May Be Transferred</h3>
          <p>User information may be transferred to and processed in:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Kenya (primary location)</li>
            <li>Ireland (European Union – for GDPR compliance)</li>
            <li>United States (Virginia – for backup and analytics)</li>
            <li>Other countries where our service providers operate</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">17.2 Safeguards for Cross-Border Transfers</h3>
          <p>We ensure adequate safeguards for cross-border data transfers by:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Using Standard Contractual Clauses (SCCs) approved by the European Commission</li>
            <li>Ensuring recipients are Privacy Shield certified (where applicable)</li>
            <li>Conducting transfer impact assessments</li>
            <li>Contractually requiring the same level of protection</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">17.3 Data Localisation Requirements</h3>
          <p>We comply with Kenyan data localisation requirements where applicable. Personal data is primarily stored on servers located in Kenya.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">18. INFORMATION SECURITY MEASURES</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">18.1 Technical Measures</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Encryption in transit</td>
                  <td className="p-2">TLS 1.3 for all data transmission</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Encryption at rest</td>
                  <td className="p-2">AES-256 for stored sensitive data</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Access controls</td>
                  <td className="p-2">Role-based access, multi-factor authentication</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Audit logging</td>
                  <td className="p-2">All access to user information is logged</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Network security</td>
                  <td className="p-2">Firewalls, intrusion detection, DDoS protection</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Backup and recovery</td>
                  <td className="p-2">Encrypted backups, tested restoration</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">18.2 Organisational Measures</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Security policies</td>
                  <td className="p-2">Written policies governing information handling</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Employee training</td>
                  <td className="p-2">Annual security and privacy training</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Vendor management</td>
                  <td className="p-2">Security assessments of third-party providers</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Incident response</td>
                  <td className="p-2">Documented breach response plan</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Regular audits</td>
                  <td className="p-2">Internal and external security audits</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">19. PROHIBITED DISCLOSURES</h2>
          <p>The following disclosures are strictly prohibited:</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm border-collapse border border-gray-300">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Selling user information to third parties</td>
                  <td className="p-2">Immediate termination, legal action</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Sharing information for marketing without consent</td>
                  <td className="p-2">Disciplinary action, regulatory fine</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Unauthorised access out of curiosity</td>
                  <td className="p-2">Disciplinary action, up to termination</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Discussing user information in public</td>
                  <td className="p-2">Disciplinary action</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Taking information offsite without approval</td>
                  <td className="p-2">Disciplinary action</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Disclosing information to unauthorised third parties</td>
                  <td className="p-2">Immediate termination, legal action</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">20. CONSEQUENCES OF UNAUTHORISED DISCLOSURE</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">20.1 For Employees and Contractors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-300 mt-3">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">First violation (negligent)</td>
                  <td className="p-2">Written warning, retraining</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Second violation (negligent)</td>
                  <td className="p-2">Suspension without pay</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Intentional unauthorised disclosure</td>
                  <td className="p-2">Immediate termination</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Disclosure for personal gain</td>
                  <td className="p-2">Termination, legal action, criminal prosecution</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-300 p-2 font-semibold text-white">Disclosure causing user harm</td>
                  <td className="p-2">Termination, legal liability, reporting to authorities</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">20.2 For the Company</h3>
          <p>Unauthorised disclosure may result in:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Regulatory fines (up to KES 5 million under Kenya Data Protection Act)</li>
            <li>Legal claims from affected users</li>
            <li>Reputational damage</li>
            <li>Loss of user trust</li>
            <li>Mandatory security audits</li>
          </ul>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">20.3 For Users</h3>
          <p>Users who knowingly cause unauthorised disclosure (e.g., sharing login credentials) may have their accounts terminated.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">21. REPORTING VIOLATIONS</h2>
          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">21.1 Internal Reporting</h3>
          <p>Report suspected violations of this Policy to:</p>
          <p className="mt-4">
            <strong>Email:</strong> <a href="mailto:compliance@initoption.com" className="text-[#1c81f8] hover:text-[#4fa3ff]">compliance@initoption.com</a><br />
            Reports may be made anonymously.
          </p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">21.2 External Reporting</h3>
          <p>Violations may also be reported to:</p>
          <p className="mt-4">
            <strong>Office of the Data Protection Commissioner (ODPC)</strong><br />
            Email: <a href="mailto:info@odpc.go.ke" className="text-[#1c81f8] hover:text-[#4fa3ff]">info@odpc.go.ke</a><br />
            Website: <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-[#1c81f8] hover:text-[#4fa3ff]">https://www.odpc.go.ke</a><br /><br />
            <strong>Financial Reporting Centre (FRC)</strong> – for AML-related breaches<br />
            Email: <a href="mailto:info@frc.go.ke" className="text-[#1c81f8] hover:text-[#4fa3ff]">info@frc.go.ke</a>
          </p>

          <h3 className="font-display text-xl font-bold text-gray-900 mt-6">21.3 Whistleblower Protection</h3>
          <p>We prohibit retaliation against individuals who report violations in good faith. Retaliation may result in disciplinary action up to termination.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">22. POLICY UPDATES</h2>
          <p>We may update this Policy at any time. Material changes will be notified via:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email to registered users</li>
            <li>Platform notification</li>
            <li>Updated "Last Updated" date at the top of this Policy</li>
          </ul>
          <p className="mt-4">Continued use of the platform constitutes acceptance of the updated Policy.</p>

          <h2 className="font-display text-2xl font-bold text-gray-900 mt-8">23. CONTACT INFORMATION</h2>
          <p>For questions about this Policy or to exercise your rights, please contact:</p>
          <p className="mt-4">
            <strong>Privacy Officer</strong><br />
            Init Option<br />
            Email: <a href="mailto:privacy@initoption.com" className="text-[#1c81f8] hover:text-[#4fa3ff]">privacy@initoption.com</a><br />
            Website: <a href="https://initoption.com" target="_blank" rel="noopener noreferrer" className="text-[#1c81f8] hover:text-[#4fa3ff]">https://initoption.com</a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default InformationDisclosure;
