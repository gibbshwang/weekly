export function EmergencyContacts() {
  return (
    <div className="w-full bg-gray-50 border-t border-gray-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
        <span>긴급 도움이 필요하신가요?</span>
        <a
          href="tel:1366"
          className="inline-flex items-center min-h-[48px] px-3 py-1 text-red-700 font-semibold hover:underline"
        >
          여성긴급전화 1366
        </a>
        <a
          href="tel:112"
          className="inline-flex items-center min-h-[48px] px-3 py-1 text-red-700 font-semibold hover:underline"
        >
          경찰 112
        </a>
      </div>
    </div>
  );
}
