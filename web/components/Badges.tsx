export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 bg-white">
      {children}
    </span>
  );
}

export function ReasonPill({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  const cls =
    v.includes("safety")
      ? "border-red-200 bg-red-50 text-red-800"
      : v.includes("efficacy")
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : v.includes("enrollment")
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : v.includes("funding")
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : v.includes("strategic")
      ? "border-gray-200 bg-gray-100 text-gray-800"
      : v.includes("regulatory")
      ? "border-purple-200 bg-purple-50 text-purple-800"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {value || "—"}
    </span>
  );
}

export function ConfidencePill({ value }: { value: string }) {
  const v = (value || "").toUpperCase();
  const cls =
    v === "HIGH"
      ? "border-green-200 bg-green-50 text-green-900"
      : v === "MEDIUM"
      ? "border-yellow-200 bg-yellow-50 text-yellow-900"
      : "border-gray-200 bg-gray-50 text-gray-800";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      Confidence: {value || "—"}
    </span>
  );
}
