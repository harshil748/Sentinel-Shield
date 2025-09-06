import { useEffect, useState } from "react";
import axios from "axios";
import * as LightweightCharts from "lightweight-charts";
import { AlertTriangle, X } from "lucide-react";
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
	const [selectedAlert, setSelectedAlert] = useState(null);
	const [alertDetail, setAlertDetail] = useState(null);

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
				if (res.data && res.data.data)
					setSuggestions(res.data.data.slice(0, 8));
				else setSuggestions([]);
			} catch (err) {
				setSuggestions([]);
			}
		} else setSuggestions([]);
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

	async function openAlertDetail(alert) {
		setSelectedAlert(alert.id);
		try {
			const res = await axios.get(`http://127.0.0.1:8000/alerts/${alert.id}`);
			setAlertDetail(res.data);
			// draw deep-dive chart with marker
			const chartElem = document.getElementById("deep_chart");
			if (!chartElem) return;
			chartElem.innerHTML = "";
			const chart = LightweightCharts.createChart(chartElem, {
				width: 700,
				height: 300,
			});
			const series = chart.addLineSeries();
			// for deep-dive fetch full recent history for symbol
			const hist = await axios.get(
				`http://127.0.0.1:8000/fetch_live?symbol=${encodeURIComponent(
					alert.symbol
				)}`
			);
			const times = (hist.data.timestamps || []).slice(-30);
			const prices = (hist.data.recent_prices || []).slice(-30);
			const pts = prices.map((p, i) => ({
				time: Math.floor(new Date(times[i]).getTime() / 1000),
				value: p,
			}));
			series.setData(pts);
			// place marker at alert.time
			const alertTime = Math.floor(new Date(alert.time).getTime() / 1000);
			series.setMarkers([
				{
					time: alertTime,
					position: "aboveBar",
					color: "red",
					shape: "arrowDown",
					text: "ALERT",
				},
			]);
		} catch (err) {
			console.error("openAlertDetail error", err);
		}
	}

	function closeDetail() {
		setSelectedAlert(null);
		setAlertDetail(null);
	}

	return (
		<div
			style={{
				padding: "16px",
				display: "grid",
				gridTemplateColumns: "2fr 1fr",
				gap: "18px",
				fontFamily: "Inter, Arial",
			}}>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "12px",
					}}>
					<h1 style={{ margin: 0 }}>Sentinel Shield</h1>
					<div style={{ width: 260 }}>
						<form
							onSubmit={handleSubmit}
							style={{ position: "relative", display: "flex" }}>
							<input
								type='text'
								value={input}
								onChange={handleInputChange}
								placeholder='Type company or symbol'
								style={{
									flex: 1,
									padding: "8px",
									borderRadius: "6px 0 0 6px",
									border: "1px solid #ccc",
								}}
							/>
							<button
								style={{
									padding: "8px 10px",
									borderRadius: "0 6px 6px 0",
									border: "none",
									background: "#0b69ff",
									color: "white",
								}}>
								Load
							</button>
							{suggestions.length > 0 && (
								<ul
									style={{
										position: "absolute",
										top: 40,
										left: 0,
										background: "white",
										border: "1px solid #ddd",
										width: "100%",
										maxHeight: 220,
										overflowY: "auto",
										padding: 0,
										margin: 0,
										zIndex: 40,
									}}>
									{suggestions.map((s, i) => (
										<li
											key={i}
											onClick={() => handleSuggestionClick(s)}
											style={{
												padding: 8,
												cursor: "pointer",
												borderBottom: "1px solid #f0f0f0",
											}}>
											{s.instrument_name} ({s.symbol}.{s.exchange})
										</li>
									))}
								</ul>
							)}
						</form>
					</div>
				</div>

				{data && (
					<>
						<div style={{ marginBottom: 8 }}>
							Symbol: <b>{data.symbol}</b> Price: <b>{data.price}</b> Volume:{" "}
							<b>{data.volume}</b>
						</div>
						<div style={{ marginBottom: 12 }}>
							Risk: <b>{data.risk_reason || "N/A"}</b> EWMA z:{" "}
							<b>{data.ewma_zscore?.toFixed(2)}</b> ML score:{" "}
							<b>{data.ml_score?.toFixed(3)}</b>
						</div>
						<div
							id='chart'
							style={{
								width: "100%",
								height: 300,
								background: "#fff",
								borderRadius: 6,
							}}></div>
					</>
				)}

				<h3 style={{ marginTop: 18 }}>Alert Feed</h3>
				<div
					style={{
						maxHeight: 340,
						overflowY: "auto",
						background: "#111",
						color: "white",
						padding: 12,
						borderRadius: 6,
					}}>
					{alerts.length === 0 && <div>No alerts</div>}
					<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
						{alerts.map((a) => (
							<li
								key={a.id}
								style={{
									padding: 8,
									borderBottom: "1px solid #222",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}>
								<div>
									<div style={{ fontWeight: 600 }}>
										{a.symbol}{" "}
										<span style={{ color: "#f0ad4e", marginLeft: 8 }}>
											{a.reason}
										</span>
									</div>
									<div style={{ fontSize: 12, color: "#bbb" }}>
										{a.time} • Source: {a.source_handle} • Trust:{" "}
										{a.trust_score}
									</div>
								</div>
								<div style={{ display: "flex", gap: 8 }}>
									<button
										onClick={() => openAlertDetail(a)}
										style={{
											padding: "6px 8px",
											borderRadius: 6,
											background: "#0b69ff",
											color: "white",
											border: "none",
										}}>
										Deep Dive
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			</div>

			<aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				<div
					style={{
						background: "#111",
						color: "white",
						padding: 12,
						borderRadius: 8,
					}}>
					<h4 style={{ margin: 0 }}>Market Threat</h4>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							marginTop: 8,
						}}>
						<div style={{ width: 80 }}>
							<CircularProgressbar
								value={threat.score}
								text={threat.level}
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
						<div>
							<div style={{ color: "#ccc" }}>Score</div>
							<div style={{ fontSize: 20, fontWeight: 700 }}>
								{threat.score}
							</div>
						</div>
					</div>
				</div>

				<div
					style={{
						background: "#111",
						color: "white",
						padding: 12,
						borderRadius: 8,
					}}>
					<h4 style={{ margin: 0 }}>Top Manipulated (24h)</h4>
					<ol style={{ marginTop: 8 }}>
						{leaderboard.length === 0 && (
							<li style={{ color: "#ccc" }}>No data</li>
						)}
						{leaderboard.map((l, i) => (
							<li key={i}>
								{l.symbol} — {l.count}
							</li>
						))}
					</ol>
				</div>
			</aside>

			{/* Deep-dive modal/panel */}
			{selectedAlert && alertDetail && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.6)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 60,
					}}>
					<div
						style={{
							width: "85%",
							maxWidth: "1100px",
							background: "white",
							borderRadius: 8,
							padding: 18,
							position: "relative",
						}}>
						<button
							onClick={closeDetail}
							style={{
								position: "absolute",
								right: 12,
								top: 12,
								border: "none",
								background: "none",
								cursor: "pointer",
							}}>
							<X />
						</button>
						<h3>Alert Deep Dive — {alertDetail.alert.symbol}</h3>
						<div style={{ display: "flex", gap: 18 }}>
							<div style={{ flex: 1 }}>
								<div
									id='deep_chart'
									style={{
										width: "100%",
										height: 300,
										background: "#fff",
										borderRadius: 6,
									}}></div>
								<div style={{ marginTop: 10 }}>
									<b>Alert time:</b> {alertDetail.alert.time} • <b>Source:</b>{" "}
									{alertDetail.alert.source_handle} (
									{alertDetail.alert.registered ? "registered" : "unverified"})
									• <b>Trust:</b> {alertDetail.alert.trust_score}
								</div>
							</div>
							<div style={{ width: 320 }}>
								<h4 style={{ marginTop: 0 }}>Metrics</h4>
								<table style={{ width: "100%", borderCollapse: "collapse" }}>
									<tbody>
										<tr>
											<td style={{ padding: 6 }}>Price</td>
											<td style={{ padding: 6 }}>{alertDetail.alert.price}</td>
										</tr>
										<tr>
											<td style={{ padding: 6 }}>Volume</td>
											<td style={{ padding: 6 }}>{alertDetail.alert.volume}</td>
										</tr>
										<tr>
											<td style={{ padding: 6 }}>Reason</td>
											<td style={{ padding: 6 }}>{alertDetail.alert.reason}</td>
										</tr>
										<tr>
											<td style={{ padding: 6 }}>ML flag</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.ml_flag ? "Yes" : "No"}
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6 }}>ML score</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.ml_score?.toFixed
													? alertDetail.alert.ml_score.toFixed(3)
													: alertDetail.alert.ml_score}
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6 }}>Created</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.created_at}
											</td>
										</tr>
									</tbody>
								</table>

								<h4 style={{ marginTop: 12 }}>Social snippets</h4>
								<div
									style={{
										maxHeight: 160,
										overflowY: "auto",
										background: "#fafafa",
										padding: 8,
										borderRadius: 6,
									}}>
									{alertDetail.social_snippets.map((s, i) => (
										<div
											key={i}
											style={{ padding: 6, borderBottom: "1px solid #eee" }}>
											<div style={{ fontWeight: 600 }}>{s.handle}</div>
											<div style={{ fontSize: 13 }}>{s.text}</div>
											<div style={{ fontSize: 11, color: "#666" }}>{s.ts}</div>
										</div>
									))}
								</div>

								<div style={{ marginTop: 12 }}>
									<button
										style={{
											padding: "8px 10px",
											borderRadius: 6,
											border: "none",
											background: "#0b69ff",
											color: "white",
										}}>
										Download Report
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
