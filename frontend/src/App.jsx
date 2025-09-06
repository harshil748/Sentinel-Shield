import { useEffect, useState } from "react";
import axios from "axios";
import { createChart } from "lightweight-charts";

function App() {
	const [data, setData] = useState(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const res = await axios.get(
					"http://127.0.0.1:8000/fetch_live?symbol=RELIANCE.NSE"
				);
				console.log("Fetched data:", res.data);
				setData(res.data);
			} catch (e) {
				console.error("Error fetching:", e);
			}
		}
		fetchData();
		const id = setInterval(fetchData, 10000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		if (data) {
			const chartElem = document.getElementById("chart");
			chartElem.innerHTML = ""; // clear old chart
			const chart = createChart(chartElem, { width: 600, height: 300 });
			const lineSeries = chart.addLineSeries();
			const prices = data.recent_prices.map((p, i) => ({
				time: i,
				value: p,
			}));
			lineSeries.setData(prices);
		}
	}, [data]);

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
					<div
						id='chart'
						style={{
							width: "600px",
							height: "300px",
							marginTop: "20px",
							background: "#fff",
						}}></div>
				</div>
			) : (
				<p>Loading…</p>
			)}
		</div>
	);
}

export default App;
