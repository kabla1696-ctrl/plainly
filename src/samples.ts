// Plainly — built-in sample documents, one click each.
// Sample 1 and 2 are short: in Auto mode they run ON-DEVICE.
// Sample 3 is long: in Auto mode it routes to the CLOUD.
// All three are fictional and written for this demo.

export interface Sample {
  id: string;
  title: string;
  docType: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "rental",
    title: "Rental agreement — deposit & moving out",
    docType: "Rental agreement (excerpt)",
    text: `RENTAL AGREEMENT — EXCERPT

1. Deposit. The tenant pays a security deposit of $1,200 before moving in. The landlord must return the deposit within 21 days after the tenant moves out, minus any amount kept for unpaid rent or damage beyond normal wear and tear. The landlord must give the tenant an itemised list of any deductions.

2. Notice. Either side may end this agreement by giving 30 days' written notice. Notice given after the 5th of the month takes effect at the end of the following month.

3. Entry. The landlord may enter the apartment with at least 24 hours' written notice, between 9am and 6pm, for inspections, repairs, or to show the apartment to new tenants.

4. Repairs. The tenant must report any leak, fault or damage in writing within 48 hours of noticing it. If the tenant does not report it, the tenant may be charged for the extra damage.

5. Pets. No pets are allowed without written permission from the landlord.`,
  },
  {
    id: "school",
    title: "School letter — Year 5 field trip",
    docType: "School letter",
    text: `Dear Parents and Carers,

Year 5 will visit the Natural History Museum on Thursday 12 March 2026. The coach leaves school at 8:45am and returns at 3:30pm. Children should wear school uniform and bring a packed lunch and a water bottle. No spending money is needed.

The cost is £14 per child, which covers the coach and entry. Please pay on ParentPay by Friday 27 February 2026. If your child receives free school meals, a packed lunch will be provided — please tick the box on the form.

Children who need medication (for example an inhaler) must bring it in a labelled bag and hand it to their teacher in the morning.

Please complete the permission slip below and return it to the school office by Friday 27 February. Children without a signed slip cannot attend.

Kind regards,
Mrs A. Patel, Year 5 Lead`,
  },
  {
    id: "insurance",
    title: "Health insurance — claim decision letter",
    docType: "Insurance letter (long)",
    text: `Dear Member,

Re: Claim reference HC-2026-88412 — physiotherapy treatment, 4 sessions, £480.00

We have reviewed your claim for physiotherapy treatment received between 12 January and 2 February 2026. We are writing to tell you that we have approved £240.00 of your claim and declined the remaining £240.00.

Why we approved part of the claim. Your policy covers up to 6 physiotherapy sessions per policy year when the treatment is referred by your GP and provided by a practitioner registered with the Health and Care Professions Council. Your GP referral dated 9 January 2026 is on file, and your practitioner is registered. The first two sessions, at £120.00 each, are covered in full.

Why we declined the rest. Your policy includes an excess of £250.00 per policy year, which applies before we pay any benefit. Your excess for this policy year was £250.00, of which £10.00 had already been used on an earlier claim (reference HC-2026-87110). That leaves £240.00 of excess still to pay. The remaining two sessions, at £120.00 each, fall entirely within that excess, so no benefit is payable for them.

What happens next. The approved amount of £240.00 will be paid into the bank account we hold for you within 10 working days of this letter. No action is needed from you for the payment.

If you disagree with this decision. You may ask us to review it. Send your request in writing within 60 days of the date of this letter, quoting your claim reference, and include any extra evidence, such as a letter from your GP explaining why the treatment was medically necessary. We will send you a written answer within 30 days of receiving your request.

If you are still unhappy after our review, you may refer your complaint to the Financial Ombudsman Service. You must do so within 6 months of our final response. You can reach them at www.financial-ombudsman.org.uk or on 0800 023 4567. Referring your complaint is free.

Your policy renews on 1 April 2026. Your excess will reset to £250.00 on that date, and your physiotherapy allowance of 6 sessions will reset at the same time.

Yours sincerely,
Claims Team, Member Services`,
  },
];
