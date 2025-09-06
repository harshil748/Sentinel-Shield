import { useEffect, useState } from "react";
import axios from "axios";
import * as LightweightCharts from "lightweight-charts";
import { AlertTriangle } from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function App() {
	const [symbol, setSymbol] = useState("RELIANCE.NSE");
	const [input, setInput] = useState("RELIANCE.NSE");
	const [suggestions, setSuggestions] = useState([]);
	const [data, setData] = useState(null);
	const [alerts, setAlerts] = useState([]);
	const [threat, setThreat] = useState({ score: 0, level: "Low" });
	const [leaderboard, setLeaderboard] = useState([]);

	async function fetchAll(sym) {
		try {
			const res = await axios.get(
				`http://127.0.0.1:8000/fetch_live_alert?symbol=${encodeURIComponent(
					sym
				)}`
			);
			setData(res.data);

			const [alertRes, threatRes, lbRes] = await Promise.all([
				axios.get("http://127.0.0.1:8000/alerts"),
				axios.get("http://127.0.0.1:8000/threat_score"),
				axios.get("http://127.0.0.1:8000/leaderboard"),
			]);
			setAlerts(alertRes.data || []);
			setThreat(threatRes.data || { score: 0, level: "Low" });
			setLeaderboard((lbRes.data && lbRes.data.top) || []);
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
			const points = (data.recent_prices || []).map((p, i) => ({
				time: Math.floor(new Date((data.timestamps || [])[i]).getTime() / 1000),
				value: p,
			}));
			lineSeries.setData(points);
		}
	}, [data]);

	async function handleInputChange(e) {
		const value = e.target.value;
		setInput(value);

		if (value.length > 0) {
			try {
				const res = await axios.get(
					`http://127.0.0.1:8000/search_symbols?query=${encodeURIComponent(
						value
					)}`
				);
				if (res.data && res.data.data) {
					setSuggestions(res.data.data.slice(0, 8));
				} else {
					setSuggestions([]);
				}
			} catch (err) {
				console.error("Search error:", err);
				setSuggestions([]);
			}
		} else {
			setSuggestions([]);
		}
	}

	function handleSuggestionClick(s) {
		const composed = `${s.symbol}.${s.exchange}`;
		setInput(composed);
		setSymbol(composed);
		setSuggestions([]);
	}

	function handleSubmit(e) {
		e.preventDefault();
		if (input.trim() !== "") {
			setSymbol(input.trim());
			setSuggestions([]);
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

				<form
					onSubmit={handleSubmit}
					style={{ marginBottom: "15px", position: "relative" }}>
					<input
						type='text'
						value={input}
						onChange={handleInputChange}
						placeholder='Type company name or symbol'
						style={{
							padding: "6px",
							marginRight: "10px",
							width: "300px",
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

					{suggestions.length > 0 && (
						<ul
							style={{
								position: "absolute",
								top: "38px",
								left: 0,
								background: "white",
								border: "1px solid #ccc",
								width: "300px",
								maxHeight: "240px",
								overflowY: "auto",
								zIndex: 10,
								listStyle: "none",
								margin: 0,
								padding: 0,
							}}>
							{suggestions.map((s, i) => (
								<li
									key={i}
									onClick={() => handleSuggestionClick(s)}
									style={{
										padding: "8px",
										cursor: "pointer",
										borderBottom: "1px solid #eee",
									}}>
									{s.instrument_name} ({s.symbol}.{s.exchange})
								</li>
							))}
						</ul>
					)}
				</form>

				{data && (
					<>
						<p>
							Symbol: {data.symbol} | Price: {data.price} | Volume:{" "}
							{data.volume}
						</p>
						<p>
							Risk: <b>{data.risk_reason || "N/A"}</b> | EWMA Z-Score:{" "}
							{data.ewma_zscore?.toFixed(2)} | Volume Ratio:{" "}
							{data.volume_ratio?.toFixed(2)}
						</p>
						<p>
							ML score: <b>{data.ml_score?.toFixed(3)}</b> | ML anomaly:{" "}
							{data.ml_is_anomaly ? "⚠️ Yes" : "✅ No"}
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
					<ul style={{ paddingLeft: 0 }}>
						{alerts.map((a, i) => (
							<li key={i} style={{ marginBottom: "8px", listStyle: "none" }}>
								<AlertTriangle size={16} color='orange' /> {a.symbol} anomaly at{" "}
								{a.time} (Price {a.price})
								<br />
								<small>
									{a.reason} | Source: {a.source_handle} | Trust:{" "}
									{a.trust_score}{" "}
									{a.registered ? "(registered)" : "(unverified)"}{" "}
									{a.ml_score ? `| ML:${a.ml_score.toFixed(3)}` : ""}
								</small>
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
						display: "flex",
						flexDirection: "column",
						gap: "12px",
					}}>
					<h2>Market Threat Gauge</h2>
					<div style={{ display: "flex", justifyContent: "center" }}>
						<div style={{ width: "120px" }}>
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

					<h3 style={{ marginTop: "6px" }}>Top Manipulated Stocks (24h)</h3>
					{leaderboard.length === 0 && <p>No activity</p>}
					<ol style={{ margin: 0, paddingLeft: "16px" }}>
						{leaderboard.map((l, idx) => (
							<li key={idx}>
								{l.symbol} — {l.count} alerts
							</li>
						))}
					</ol>
				</div>
			</div>
		</div>
	);
}

export default App;
