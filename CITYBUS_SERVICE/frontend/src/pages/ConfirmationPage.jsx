export default function ConfirmationPage() {
  const result = JSON.parse(sessionStorage.getItem("bookingResult") || "{}");
  return (
    <div className="page">
      <div className="card">
        <h2>Booking Confirmed</h2>
        <p>Booking Ref: {result.bookingRef || "N/A"}</p>
        <p>Total Paid: Rs. {result.totalFare || 0}</p>
        <p>Your e-ticket is generated. Track bus in real-time from the tracking page.</p>
      </div>
    </div>
  );
}
