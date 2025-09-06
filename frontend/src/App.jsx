import { useEffect, useState } from "react";
import axios from "axios";
import { createChart } from "lightweight-charts";

function App() {
	const [data, setData] = useState(null);
	const [chart, setChart] = useState(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const res = await axios.get(
					"http://127.0.0.1:8000/fetch_live?symbol=RELIANCE.NSE"
				);
				setData(res.data);
			} catch (e) {
				console.error("Error fetching:", e);
			}
		}
		fetchData();
		const id = setInterval(fetchData, 10000); // refresh every 10s
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		if (data && !chart) {
			const chartElem = document.getElementById("chart");
			const c = createChart(chartElem, { width: 600, height: 300 });
			const lineSeries = c.addLineSeries();
			const prices = data.recent_prices.map((p, i) => ({
				time: i,
				value: p,
			}));
			lineSeries.setData(prices);
			setChart(c);
		}
	}, [data, chart]);

	return (
		<div className='p-4'>
			<h1>Sentinel Shield Dashboard</h1>
			{data ? (
				<div>
					<p>
						Symbol: {data.symbol} | Price: {data.price} | Volume: {data.volume}
					</p>
					<p>
						EWMA Z-Score: {data.ewma_zscore.toFixed(2)} | Volume Ratio:{" "}
						{data.volume_ratio.toFixed(2)} | Anomaly:{" "}
						{data.is_anomaly ? "⚠️ Yes" : "✅ No"}
					</p>
					<div id='chart' style={{ marginTop: "20px" }}></div>
				</div>
			) : (
				<p>Loading…</p>
			)}
		</div>
	);
}

export default App;
