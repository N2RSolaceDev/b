{req.status === 'quoted' && req.bmacLink && (
  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
    <p><strong>Quoted: ${req.price}</strong></p>
    <a
      href={req.bmacLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block mt-2 bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 transition text-sm font-medium"
    >
      💸 Pay via BuyMeACoffee
    </a>
  </div>
)}
