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
	const [liveAlerts, setLiveAlerts] = useState([]);

	// Investigation hub state
	const [invSymbol, setInvSymbol] = useState("");
	const [invHandle, setInvHandle] = useState("");
	const [invFrom, setInvFrom] = useState("");
	const [invTo, setInvTo] = useState("");
	const [invLimit, setInvLimit] = useState(100);
	const [invResults, setInvResults] = useState([]);
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
				axios.get("http://127.0.0.1:8000/alerts?limit=50"),
				axios.get("http://127.0.0.1:8000/threat_score"),
				axios.get("http://127.0.0.1:8000/leaderboard"),
			]);
			setAlerts(alertRes.data || []);
			setLiveAlerts(alertRes.data?.slice(0, 10) || []); // Show latest 10 for live feed
			setThreat(threatRes.data || { score: 0, level: "Low" });
			setLeaderboard((lbRes.data && lbRes.data.top) || []);
		} catch (error) {
			console.error("Error fetching:", error);
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
			if (!chartElem) return;
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
			} catch (error) {
				setSuggestions([]);
				console.error("Search error:", error);
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

	// Investigation search
	async function runInvestigation(e) {
		e && e.preventDefault();
		try {
			const params = new URLSearchParams();
			if (invSymbol.trim()) params.append("symbol", invSymbol.trim());
			if (invHandle.trim()) params.append("handle", invHandle.trim());
			if (invFrom.trim()) params.append("from_ts", invFrom);
			if (invTo.trim()) params.append("to_ts", invTo);
			if (invLimit) params.append("limit", invLimit);
			const url = `http://127.0.0.1:8000/alerts?${params.toString()}`;
			const res = await axios.get(url);
			setInvResults(res.data || []);
		} catch (err) {
			console.error("Investigation error", err);
			setInvResults([]);
		}
	}

	// CSV export for investigation results
	function downloadCSV() {
		if (!invResults || invResults.length === 0) return;
		const headers = Object.keys(invResults[0]);
		const csvRows = [headers.join(",")];
		for (const row of invResults) {
			const vals = headers.map((h) => {
				const v = row[h];
				if (v === null || v === undefined) return "";
				return `"${String(v).replace(/"/g, '""')}"`;
			});
			csvRows.push(vals.join(","));
		}
		const csv = csvRows.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `alerts_export_${new Date().toISOString()}.csv`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	async function openAlertDetail(alert) {
		setSelectedAlert(alert.id);
		try {
			const res = await axios.get(`http://127.0.0.1:8000/alerts/${alert.id}`);
			setAlertDetail(res.data);
			// deep chart
			const chartElem = document.getElementById("deep_chart");
			if (!chartElem) return;
			chartElem.innerHTML = "";
			const chart = LightweightCharts.createChart(chartElem, {
				width: 700,
				height: 300,
			});
			const series = chart.addLineSeries();
			const hist = await axios.get(
				`http://127.0.0.1:8000/fetch_live?symbol=${encodeURIComponent(
					alert.symbol
				)}`
			);
			const times = (hist.data.timestamps || []).slice(-60);
			const prices = (hist.data.recent_prices || []).slice(-60);
			const pts = prices.map((p, i) => ({
				time: Math.floor(new Date(times[i]).getTime() / 1000),
				value: p,
			}));
			series.setData(pts);
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
				padding: 16,
				display: "grid",
				gridTemplateColumns: "2fr 1fr",
				gap: 18,
				fontFamily: "Inter, Arial",
			}}>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
					}}>
					<h1 style={{ margin: 0 }}>Sentinel Shield</h1>
					<div style={{ width: 320 }}>
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
									padding: 8,
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
							<span style={{ fontWeight: 600 }}>Symbol:</span>{" "}
							<b>{data.symbol}</b> |
							<span style={{ fontWeight: 600 }}> Price:</span>{" "}
							<b>₹{data.price}</b> |
							<span style={{ fontWeight: 600 }}> Volume:</span>{" "}
							<b>{data.volume?.toLocaleString()}</b>
						</div>
						<div style={{ marginBottom: 8 }}>
							<span style={{ fontWeight: 600 }}>Risk Level:</span>
							<span
								style={{
									color:
										data.severity_level >= 3
											? "#dc2626"
											: data.severity_level >= 2
											? "#ea580c"
											: data.severity_level >= 1
											? "#f59e0b"
											: "#22c55e",
									fontWeight: "bold",
									marginLeft: 8,
								}}>
								{data.risk_reason || "Normal"}
							</span>
							{data.manipulation_confidence && (
								<span style={{ marginLeft: 16 }}>
									<span style={{ fontWeight: 600 }}>Confidence:</span>
									<b
										style={{
											color:
												data.manipulation_confidence > 70
													? "#dc2626"
													: data.manipulation_confidence > 40
													? "#ea580c"
													: "#22c55e",
										}}>
										{data.manipulation_confidence}%
									</b>
								</span>
							)}
						</div>
						<div style={{ marginBottom: 12, fontSize: 14, color: "#666" }}>
							<span style={{ fontWeight: 600 }}>EWMA Z-Score:</span>{" "}
							<b>{data.ewma_zscore?.toFixed(2)}</b> |
							<span style={{ fontWeight: 600 }}> Volume Ratio:</span>{" "}
							<b>{data.volume_ratio?.toFixed(2)}x</b> |
							<span style={{ fontWeight: 600 }}> ML Score:</span>{" "}
							<b>{data.ml_score?.toFixed(3)}</b>
							{data.social_signals && data.social_signals.length > 0 && (
								<span>
									{" "}
									| <span style={{ fontWeight: 600 }}>
										Social Signals:
									</span>{" "}
									<b>{data.social_signals.length}</b>
								</span>
							)}
						</div>
						<div
							id='chart'
							style={{
								width: "100%",
								height: 300,
								background: "#fff",
								borderRadius: 6,
								border: "1px solid #e5e7eb",
							}}></div>
					</>
				)}

				<h3 style={{ marginTop: 18 }}>Investigation Hub</h3>
				<div
					style={{
						background: "#fafafa",
						padding: 12,
						borderRadius: 6,
						marginBottom: 8,
					}}>
					<form
						onSubmit={runInvestigation}
						style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
						<input
							placeholder='symbol (exact)'
							value={invSymbol}
							onChange={(e) => setInvSymbol(e.target.value)}
							style={{
								padding: 8,
								borderRadius: 4,
								border: "1px solid #ccc",
								width: 160,
							}}
						/>
						<input
							placeholder='handle (source)'
							value={invHandle}
							onChange={(e) => setInvHandle(e.target.value)}
							style={{
								padding: 8,
								borderRadius: 4,
								border: "1px solid #ccc",
								width: 160,
							}}
						/>
						<input
							type='datetime-local'
							value={invFrom}
							onChange={(e) => setInvFrom(e.target.value)}
							style={{ padding: 8 }}
						/>
						<input
							type='datetime-local'
							value={invTo}
							onChange={(e) => setInvTo(e.target.value)}
							style={{ padding: 8 }}
						/>
						<input
							type='number'
							value={invLimit}
							onChange={(e) => setInvLimit(e.target.value)}
							style={{ width: 80, padding: 8 }}
						/>
						<button
							style={{
								padding: "8px 12px",
								background: "#0b69ff",
								color: "white",
								border: "none",
								borderRadius: 4,
							}}>
							Search
						</button>
						<button
							type='button'
							onClick={downloadCSV}
							style={{
								padding: "8px 12px",
								background: "#2d9cdb",
								color: "white",
								border: "none",
								borderRadius: 4,
							}}>
							Download CSV
						</button>
					</form>
				</div>

				<div
					style={{
						maxHeight: 320,
						overflowY: "auto",
						background: "#111",
						color: "white",
						padding: 12,
						borderRadius: 6,
					}}>
					{invResults.length === 0 && (
						<div style={{ color: "#ccc" }}>
							No results. Use the Investigation Hub to query past alerts.
						</div>
					)}
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							color: "white",
						}}>
						<thead>
							<tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
								<th style={{ padding: 6 }}>Time</th>
								<th style={{ padding: 6 }}>Symbol</th>
								<th style={{ padding: 6 }}>Reason</th>
								<th style={{ padding: 6 }}>Source</th>
								<th style={{ padding: 6 }}>Trust</th>
								<th style={{ padding: 6 }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{invResults.map((r) => (
								<tr key={r.id} style={{ borderBottom: "1px solid #222" }}>
									<td style={{ padding: 6 }}>{r.time}</td>
									<td style={{ padding: 6 }}>{r.symbol}</td>
									<td style={{ padding: 6 }}>{r.reason}</td>
									<td style={{ padding: 6 }}>{r.source_handle}</td>
									<td style={{ padding: 6 }}>{r.trust_score}</td>
									<td style={{ padding: 6 }}>
										<button
											onClick={() => openAlertDetail(r)}
											style={{
												padding: "6px 8px",
												borderRadius: 6,
												background: "#0b69ff",
												color: "white",
												border: "none",
											}}>
											Deep Dive
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
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
					<h4 style={{ margin: 0 }}>Market Threat Level</h4>
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
										threat.color ||
										(threat.level === "Critical" || threat.level === "High"
											? "red"
											: threat.level === "Medium"
											? "orange"
											: "green"),
									textColor: "white",
									textSize: "14px",
								})}
							/>
						</div>
						<div>
							<div style={{ color: "#ccc", fontSize: 12 }}>Threat Score</div>
							<div style={{ fontSize: 20, fontWeight: 700 }}>
								{threat.score}
							</div>
							{threat.details?.alerts_last_hour > 0 && (
								<div style={{ fontSize: 11, color: "#fbbf24" }}>
									{threat.details.alerts_last_hour} alerts/hour
								</div>
							)}
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
					<h4 style={{ margin: 0, marginBottom: 8 }}>Live Alert Feed</h4>
					<div style={{ maxHeight: 200, overflowY: "auto" }}>
						{liveAlerts.length === 0 && (
							<div style={{ color: "#666", fontSize: 12 }}>
								No recent alerts
							</div>
						)}
						{liveAlerts.slice(0, 5).map((alert) => (
							<div
								key={alert.id}
								style={{
									borderBottom: "1px solid #333",
									paddingBottom: 8,
									marginBottom: 8,
									fontSize: 12,
								}}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginBottom: 4,
									}}>
									<span style={{ fontWeight: 600, color: "#60a5fa" }}>
										{alert.symbol}
									</span>
									<span
										style={{
											backgroundColor:
												alert.severity_level >= 3
													? "#dc2626"
													: alert.severity_level >= 2
													? "#ea580c"
													: alert.severity_level >= 1
													? "#f59e0b"
													: "#22c55e",
											color: "white",
											padding: "2px 6px",
											borderRadius: 3,
											fontSize: 10,
										}}>
										{alert.severity_level >= 3
											? "HIGH"
											: alert.severity_level >= 2
											? "MED"
											: alert.severity_level >= 1
											? "LOW"
											: "INFO"}
									</span>
								</div>
								<div style={{ color: "#ccc", marginBottom: 2 }}>
									{alert.reason?.substring(0, 40)}
									{alert.reason?.length > 40 ? "..." : ""}
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										fontSize: 10,
										color: "#888",
									}}>
									<span>Trust: {alert.trust_score}</span>
									{alert.manipulation_confidence && (
										<span>{alert.manipulation_confidence}% conf.</span>
									)}
								</div>
							</div>
						))}
					</div>
					{liveAlerts.length > 5 && (
						<div
							style={{
								textAlign: "center",
								marginTop: 8,
								fontSize: 11,
								color: "#60a5fa",
								cursor: "pointer",
							}}>
							View all {liveAlerts.length} alerts
						</div>
					)}
				</div>

				<div
					style={{
						background: "#111",
						color: "white",
						padding: 12,
						borderRadius: 8,
					}}>
					<h4 style={{ margin: 0 }}>Top Manipulated (24h)</h4>
					<ol style={{ marginTop: 8, fontSize: 13 }}>
						{leaderboard.length === 0 && (
							<li style={{ color: "#ccc" }}>No data</li>
						)}
						{leaderboard.map((l, i) => (
							<li key={i} style={{ marginBottom: 4 }}>
								<span style={{ color: "#60a5fa", fontWeight: 600 }}>
									{l.symbol}
								</span>
								<span style={{ color: "#ccc" }}> — {l.count} alerts</span>
							</li>
						))}
					</ol>
				</div>
			</aside>

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
								<h4 style={{ marginTop: 0 }}>Alert Metrics</h4>
								<table
									style={{
										width: "100%",
										borderCollapse: "collapse",
										fontSize: 13,
									}}>
									<tbody>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>Symbol</td>
											<td style={{ padding: 6 }}>{alertDetail.alert.symbol}</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>Price</td>
											<td style={{ padding: 6 }}>₹{alertDetail.alert.price}</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>Volume</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.volume?.toLocaleString()}
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>Severity</td>
											<td style={{ padding: 6 }}>
												<span
													style={{
														backgroundColor:
															alertDetail.alert.severity_level >= 3
																? "#dc2626"
																: alertDetail.alert.severity_level >= 2
																? "#ea580c"
																: alertDetail.alert.severity_level >= 1
																? "#f59e0b"
																: "#22c55e",
														color: "white",
														padding: "2px 8px",
														borderRadius: 4,
														fontSize: 11,
													}}>
													Level {alertDetail.alert.severity_level || 1}
												</span>
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>
												Confidence
											</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.manipulation_confidence || "N/A"}%
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>Reason</td>
											<td style={{ padding: 6 }}>{alertDetail.alert.reason}</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>ML Flag</td>
											<td style={{ padding: 6 }}>
												<span
													style={{
														color: alertDetail.alert.ml_flag
															? "#dc2626"
															: "#22c55e",
														fontWeight: 600,
													}}>
													{alertDetail.alert.ml_flag ? "DETECTED" : "Clear"}
												</span>
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>ML Score</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.ml_score?.toFixed
													? alertDetail.alert.ml_score.toFixed(3)
													: alertDetail.alert.ml_score || "N/A"}
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>
												Social Signals
											</td>
											<td style={{ padding: 6 }}>
												{alertDetail.alert.social_signals_count || 0} detected
											</td>
										</tr>
										<tr>
											<td style={{ padding: 6, fontWeight: 600 }}>Created</td>
											<td style={{ padding: 6, fontSize: 11 }}>
												{new Date(
													alertDetail.alert.created_at
												).toLocaleString()}
											</td>
										</tr>
									</tbody>
								</table>

								<h4 style={{ marginTop: 12 }}>Social Media Intelligence</h4>
								<div
									style={{
										maxHeight: 180,
										overflowY: "auto",
										background: "#fafafa",
										padding: 8,
										borderRadius: 6,
									}}>
									{alertDetail.social_snippets.map((s, i) => (
										<div
											key={i}
											style={{
												padding: 8,
												borderBottom: "1px solid #eee",
												marginBottom: 6,
												borderLeft: `3px solid ${
													s.manipulation_confidence > 0.7
														? "#dc2626"
														: s.manipulation_confidence > 0.4
														? "#f59e0b"
														: "#22c55e"
												}`,
											}}>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													marginBottom: 4,
												}}>
												<div style={{ fontWeight: 600, fontSize: 13 }}>
													{s.handle}
													<span
														style={{
															marginLeft: 8,
															fontSize: 10,
															backgroundColor: "#e5e7eb",
															padding: "1px 4px",
															borderRadius: 3,
														}}>
														{s.platform}
													</span>
												</div>
												<div style={{ fontSize: 10 }}>
													<span
														style={{
															color:
																s.manipulation_confidence > 0.7
																	? "#dc2626"
																	: s.manipulation_confidence > 0.4
																	? "#f59e0b"
																	: "#22c55e",
															fontWeight: 600,
														}}>
														{(s.manipulation_confidence * 100).toFixed(0)}%
													</span>
												</div>
											</div>
											<div
												style={{
													fontSize: 12,
													marginBottom: 4,
													lineHeight: 1.4,
												}}>
												{s.text}
											</div>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													fontSize: 10,
													color: "#666",
												}}>
												<span>{new Date(s.ts).toLocaleTimeString()}</span>
												<span>
													Sentiment: {(s.sentiment_score * 100).toFixed(0)}%
												</span>
											</div>
										</div>
									))}
								</div>

								{alertDetail.entity_verification && (
									<div style={{ marginTop: 12 }}>
										<h5 style={{ margin: 0, marginBottom: 6, fontSize: 13 }}>
											Entity Verification
										</h5>
										<div
											style={{
												display: "flex",
												gap: 8,
												fontSize: 11,
												marginBottom: 8,
											}}>
											<span
												style={{
													backgroundColor: "#22c55e",
													color: "white",
													padding: "2px 6px",
													borderRadius: 3,
												}}>
												✓ {alertDetail.entity_verification.verified_entities}{" "}
												Verified
											</span>
											<span
												style={{
													backgroundColor: "#f59e0b",
													color: "white",
													padding: "2px 6px",
													borderRadius: 3,
												}}>
												⚠ {alertDetail.entity_verification.unverified_entities}{" "}
												Unverified
											</span>
											<span
												style={{
													backgroundColor: "#dc2626",
													color: "white",
													padding: "2px 6px",
													borderRadius: 3,
												}}>
												⚡ {alertDetail.entity_verification.high_risk_sources}{" "}
												High Risk
											</span>
										</div>
									</div>
								)}

								{alertDetail.coordination_analysis && (
									<div style={{ marginTop: 12 }}>
										<h5 style={{ margin: 0, marginBottom: 6, fontSize: 13 }}>
											Coordination Analysis
										</h5>
										<div
											style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>
											{alertDetail.coordination_analysis.network_analysis}
										</div>
									</div>
								)}

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
