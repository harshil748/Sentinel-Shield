import { useEffect, useState } from "react";
import axios from "axios";
import * as LightweightCharts from "lightweight-charts";
import { AlertTriangle } from "lucide-react";

function App() {
	const [data, setData] = useState(null);
	const [alerts, setAlerts] = useState([]);

	// fetch live + push alert
	useEffect(() => {
		async function fetchData() {
			try {
				const res = await axios.get(
					"http://127.0.0.1:8000/fetch_live_alert?symbol=RELIANCE.NSE"
				);
				setData(res.data);
				const alertRes = await axios.get("http://127.0.0.1:8000/alerts");
				setAlerts(alertRes.data);
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
			chartElem.innerHTML = "";
			const chart = LightweightCharts.createChart(chartElem, {
				width: 600,
				height: 300,
			});
			const lineSeries = chart.addLineSeries();
			const points = data.recent_prices.map((p, i) => ({
				time: Math.floor(new Date(data.timestamps[i]).getTime() / 1000),
				value: p,
			}));
			lineSeries.setData(points);
		}
	}, [data]);

	return (
		<div
			style={{
				padding: "20px",
				display: "grid",
				gridTemplateColumns: "2fr 1fr",
				gap: "20px",
			}}>
			<div>
				<h1>Sentinel Shield Dashboard</h1>
				{data && (
					<>
						<p>
							Symbol: {data.symbol} | Price: {data.price} | Volume:{" "}
							{data.volume}
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
								background: "#fff",
							}}></div>
					</>
				)}
			</div>

			<div
				style={{
					background: "#1e1e1e",
					padding: "10px",
					borderRadius: "8px",
					color: "white",
				}}>
				<h2>Alert Feed</h2>
				{alerts.length === 0 && <p>No alerts yet</p>}
				<ul>
					{alerts.map((a, i) => (
						<li key={i} style={{ marginBottom: "8px" }}>
							<AlertTriangle size={16} color='orange' /> {a.symbol} anomaly at{" "}
							{a.time} (Price {a.price})
							<br />
							<small>{a.reason}</small>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default App;
