import { useEffect, useState } from "react";
import axios from "axios";
import * as LightweightCharts from "lightweight-charts";
import { AlertTriangle } from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function App() {
	const [symbol, setSymbol] = useState("RELIANCE.NSE");
	const [input, setInput] = useState("RELIANCE.NSE");
	const [data, setData] = useState(null);
	const [alerts, setAlerts] = useState([]);
	const [threat, setThreat] = useState({ score: 0, level: "Low" });

	async function fetchAll(sym) {
		try {
			const res = await axios.get(
				`http://127.0.0.1:8000/fetch_live_alert?symbol=${sym}`
			);
			setData(res.data);

			const alertRes = await axios.get("http://127.0.0.1:8000/alerts");
			setAlerts(alertRes.data);

			const threatRes = await axios.get("http://127.0.0.1:8000/threat_score");
			setThreat(threatRes.data);
		} catch (e) {
			console.error("Error fetching:", e);
		}
	}

	useEffect(() => {
		fetchAll(symbol);
		const id = setInterval(() => fetchAll(symbol), 10000);
		return () => clearInterval(id);
	}, [symbol]);

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

	function handleSubmit(e) {
		e.preventDefault();
		if (input.trim() !== "") {
			setSymbol(input.trim());
		}
	}

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

				{/* Symbol search box */}
				<form onSubmit={handleSubmit} style={{ marginBottom: "15px" }}>
					<input
						type='text'
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder='Enter symbol e.g. TCS.NSE'
						style={{
							padding: "6px",
							marginRight: "10px",
							width: "200px",
							borderRadius: "4px",
							border: "1px solid #ccc",
						}}
					/>
					<button
						type='submit'
						style={{
							padding: "6px 12px",
							borderRadius: "4px",
							border: "none",
							background: "#007bff",
							color: "white",
							cursor: "pointer",
						}}>
						Load
					</button>
				</form>

				{data && (
					<>
						<p>
							Symbol: {data.symbol} | Price: {data.price} | Volume:{" "}
							{data.volume}
						</p>
						<p>
							Risk: <b>{data.risk_reason}</b> | EWMA Z-Score:{" "}
							{data.ewma_zscore.toFixed(2)} | Volume Ratio:{" "}
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
					display: "flex",
					flexDirection: "column",
					gap: "20px",
				}}>
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

				<div
					style={{
						background: "#1e1e1e",
						padding: "20px",
						borderRadius: "8px",
						color: "white",
					}}>
					<h2>Market Threat Gauge</h2>
					<CircularProgressbar
						value={threat.score}
						text={`${threat.level}`}
						styles={buildStyles({
							pathColor:
								threat.level === "High"
									? "red"
									: threat.level === "Medium"
									? "orange"
									: "green",
							textColor: "white",
						})}
					/>
				</div>
			</div>
		</div>
	);
}

export default App;
