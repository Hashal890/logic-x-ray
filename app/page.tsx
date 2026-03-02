import dynamic from "next/dynamic";

const App = dynamic(() => import("../components/app"), {
  ssr: false,
  loading: () => (
    <div style={{ color: "#00d1b2", padding: 40, fontFamily: "monospace" }}>
      Loading Logic-X-Ray…
    </div>
  ),
});

export default function Home() {
  return <App />;
}
