import {
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell } from "../components/email-shell";

export type InvoiceEmailItem = {
  description: string;
  quantity: string;
  unitAmount: string;
  lineAmount: string;
};

export default function InvoiceEmail({
  email = "customer@company.com",
  invoiceNumber = "INV-1001",
  amountDue = "$120.00",
  dueDateLabel = "August 1, 2026",
  organizationName = "Acme Payments",
  customerName = "Jordan Lee",
  description = "Monthly platform fee",
  items = [
    {
      description: "Platform subscription",
      quantity: "1",
      unitAmount: "$120.00",
      lineAmount: "$120.00",
    },
  ],
  payUrl = "http://localhost:3000/i/example",
  hostedInvoiceUrl = "http://localhost:3000/i/example",
  environmentLabel,
  wordmarkUrl,
}: {
  email: string;
  invoiceNumber: string;
  amountDue: string;
  dueDateLabel: string;
  organizationName: string;
  customerName?: string | null;
  description?: string | null;
  items: InvoiceEmailItem[];
  payUrl: string;
  hostedInvoiceUrl?: string | null;
  environmentLabel?: string | null;
  wordmarkUrl?: string;
}) {
  const preview = `Invoice ${invoiceNumber} from ${organizationName}`;

  return (
    <EmailShell preview={preview} email={email} wordmarkUrl={wordmarkUrl}>
      <Text className="mb-2 mt-8 text-[13px] uppercase tracking-[0.08em] text-neutral-500">
        Invoice from {organizationName}
        {environmentLabel ? ` (${environmentLabel})` : ""}
      </Text>
      <Heading className="mx-0 my-2 p-0 text-[28px] font-medium text-black">
        {amountDue} due
      </Heading>
      <Text className="mb-6 text-sm text-neutral-600">
        Invoice {invoiceNumber} · Due {dueDateLabel}
      </Text>
      <Text className="text-sm leading-6 text-black">
        Hi{customerName ? ` ${customerName}` : ""},
      </Text>
      <Text className="text-sm leading-6 text-black">
        {organizationName} sent you an invoice for {amountDue}.
        {description ? ` Memo: ${description}` : ""}
      </Text>

      <Section className="my-6">
        <table className="w-full border-collapse text-sm text-black">
          <thead>
            <tr>
              <th className="border-b border-neutral-200 pb-2 text-left font-semibold text-neutral-500">
                Description
              </th>
              <th className="border-b border-neutral-200 pb-2 text-right font-semibold text-neutral-500">
                Qty
              </th>
              <th className="border-b border-neutral-200 pb-2 text-right font-semibold text-neutral-500">
                Unit price
              </th>
              <th className="border-b border-neutral-200 pb-2 text-right font-semibold text-neutral-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.description}-${item.lineAmount}`}>
                <td className="border-b border-neutral-200 py-3 pr-2">
                  {item.description}
                </td>
                <td className="border-b border-neutral-200 px-2 py-3 text-right">
                  {item.quantity}
                </td>
                <td className="border-b border-neutral-200 px-2 py-3 text-right">
                  {item.unitAmount}
                </td>
                <td className="border-b border-neutral-200 py-3 text-right">
                  {item.lineAmount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Text className="text-right text-[15px] font-semibold text-black">
        Total due: {amountDue}
      </Text>

      <Section className="mb-8 mt-8">
        <Link
          className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={payUrl}
        >
          Pay invoice
        </Link>
      </Section>

      {hostedInvoiceUrl ? (
        <>
          <Hr className="my-6 border-neutral-200" />
          <Text className="text-sm leading-6 text-neutral-500">
            You can also view this invoice online:{" "}
            <Link className="text-blue-600 no-underline" href={hostedInvoiceUrl}>
              {hostedInvoiceUrl.replace(/^https?:\/\//, "")}
            </Link>
          </Text>
        </>
      ) : null}
    </EmailShell>
  );
}
