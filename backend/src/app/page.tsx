export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', marginTop: '10vh' }}>
      <h1>Backend AI Server is Running</h1>
      <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
        This server is handling your natural language to SQL AI requests.
      </p>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        Your new UI is running separately via Vite. Please check your terminal output for the Vite "Local: http://localhost:517X/" link.
      </p>
      <p style={{ marginTop: '1rem' }}>
        <strong>Typically, your frontend is located at:</strong><br /><br />
        <a href="http://localhost:5173" style={{ color: 'blue', textDecoration: 'underline' }}>http://localhost:5173</a> or <br />
        <a href="http://localhost:5174" style={{ color: 'blue', textDecoration: 'underline' }}>http://localhost:5174</a>
      </p>
    </div>
  );
}
