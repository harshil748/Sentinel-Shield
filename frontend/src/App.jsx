import { useEffect, useState } from "react";
import axios from "axios";
import * as LightweightCharts from "lightweight-charts";
import {
	AlertTriangle,
	X,
	Search,
	Download,
	Shield,
	Activity,
	TrendingUp,
	Eye,
	Filter,
	RefreshCw,
	Bell,
	BarChart3,
	Users,
	Globe,
} from "lucide-react";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Import custom components
import LoadingSpinner from "./components/LoadingSpinner";
import AlertCard from "./components/AlertCard";
import ThreatMeter from "./components/ThreatMeter";
import StatsCard from "./components/StatsCard";

function App() {
	const [symbol, setSymbol] = useState("RELIANCE.NSE");
	const [input, setInput] = useState("RELIANCE.NSE");
	const [suggestions, setSuggestions] = useState([]);
	const [data, setData] = useState(null);
	const [_alerts, setAlerts] = useState([]);
	const [threat, setThreat] = useState({ score: 0, level: "Low" });
	const [leaderboard, setLeaderboard] = useState([]);
	const [liveAlerts, setLiveAlerts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isAutoRefresh, setIsAutoRefresh] = useState(true);

	// Investigation hub state
	const [invSymbol, setInvSymbol] = useState("");
	const [invHandle, setInvHandle] = useState("");
	const [invFrom, setInvFrom] = useState("");
	const [invTo, setInvTo] = useState("");
	const [invLimit, setInvLimit] = useState(100);
	const [invResults, setInvResults] = useState([]);
	const [selectedAlert, setSelectedAlert] = useState(null);
	const [alertDetail, setAlertDetail] = useState(null);
	const [isInvestigationOpen, setIsInvestigationOpen] = useState(false);

	async function fetchAll(sym) {
		try {
			setLoading(true);
			setError(null);

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
			setLiveAlerts(alertRes.data?.slice(0, 10) || []);
			setThreat(threatRes.data || { score: 0, level: "Low" });
			setLeaderboard((lbRes.data && lbRes.data.top) || []);
		} catch (error) {
			console.error("Error fetching:", error);
			setError(
				"Failed to fetch data. Please check if the backend server is running."
			);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchAll(symbol);
		if (isAutoRefresh) {
			const id = setInterval(() => fetchAll(symbol), 10000);
			return () => clearInterval(id);
		}
	}, [symbol, isAutoRefresh]);

	useEffect(() => {
		if (data && data.recent_prices && data.timestamps) {
			const chartElem = document.getElementById("chart");
			if (!chartElem) return;

			chartElem.innerHTML = "";
			const chart = LightweightCharts.createChart(chartElem, {
				width: chartElem.clientWidth,
				height: 300,
				layout: {
					background: { color: "transparent" },
					textColor: "#d1d5db",
				},
				grid: {
					vertLines: { color: "#374151" },
					horzLines: { color: "#374151" },
				},
				rightPriceScale: {
					borderColor: "#374151",
				},
				timeScale: {
					borderColor: "#374151",
					timeVisible: true,
					secondsVisible: false,
				},
			});

			const lineSeries = chart.addLineSeries({
				color: "#3b82f6",
				lineWidth: 2,
			});

			const points = (data.recent_prices || []).map((p, i) => {
				const timestamp = data.timestamps[i];
				return {
					time: Math.floor(new Date(timestamp).getTime() / 1000),
					value: p,
				};
			});

			lineSeries.setData(points);

			// Add alert markers if this is an anomaly
			if (data.is_anomaly) {
				const alertTime = Math.floor(new Date().getTime() / 1000);
				lineSeries.setMarkers([
					{
						time: alertTime,
						position: "aboveBar",
						color: "#ef4444",
						shape: "arrowDown",
						text: "ALERT",
					},
				]);
			}

			// Resize handler
			const resizeHandler = () => {
				chart.applyOptions({ width: chartElem.clientWidth });
			};
			window.addEventListener("resize", resizeHandler);

			return () => {
				window.removeEventListener("resize", resizeHandler);
				chart.remove();
			};
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

	async function runInvestigation(e) {
		e && e.preventDefault();
		try {
			setLoading(true);
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
			setError("Investigation failed. Please try again.");
		} finally {
			setLoading(false);
		}
	}

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

		const csv = csvRows.join("\\n");
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
			setLoading(true);
			const res = await axios.get(`http://127.0.0.1:8000/alerts/${alert.id}`);
			setAlertDetail(res.data);

			// Update deep chart
			setTimeout(() => {
				const chartElem = document.getElementById("deep_chart");
				if (!chartElem) return;

				chartElem.innerHTML = "";
				const chart = LightweightCharts.createChart(chartElem, {
					width: chartElem.clientWidth,
					height: 300,
					layout: {
						background: { color: "transparent" },
						textColor: "#374151",
					},
					grid: {
						vertLines: { color: "#e5e7eb" },
						horzLines: { color: "#e5e7eb" },
					},
				});

				// Fetch historical data for the alert
				axios
					.get(
						`http://127.0.0.1:8000/fetch_live?symbol=${encodeURIComponent(
							alert.symbol
						)}`
					)
					.then((hist) => {
						const times = (hist.data.timestamps || []).slice(-60);
						const prices = (hist.data.recent_prices || []).slice(-60);
						const pts = prices.map((p, i) => ({
							time: Math.floor(new Date(times[i]).getTime() / 1000),
							value: p,
						}));

						const series = chart.addLineSeries({
							color: "#3b82f6",
							lineWidth: 2,
						});
						series.setData(pts);

						const alertTime = Math.floor(new Date(alert.time).getTime() / 1000);
						series.setMarkers([
							{
								time: alertTime,
								position: "aboveBar",
								color: "#ef4444",
								shape: "arrowDown",
								text: "ALERT",
							},
						]);
					});
			}, 100);
		} catch (err) {
			console.error("openAlertDetail error", err);
			setError("Failed to load alert details.");
		} finally {
			setLoading(false);
		}
	}

	function closeDetail() {
		setSelectedAlert(null);
		setAlertDetail(null);
	}

	const getSeverityColor = (level) => {
		switch (level) {
			case 4:
				return "text-red-500";
			case 3:
				return "text-red-400";
			case 2:
				return "text-orange-400";
			case 1:
				return "text-yellow-400";
			default:
				return "text-green-400";
		}
	};

	const formatCurrency = (value) => {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency: "INR",
			minimumFractionDigits: 2,
		}).format(value);
	};

	const formatNumber = (value) => {
		return new Intl.NumberFormat("en-IN").format(value);
	};

	return (
		<div
			className='min-h-screen'
			style={{
				background: "var(--bg-primary)",
				fontFamily: "var(--font-family)",
			}}>
			{/* Header */}
			<header
				className='glass-card'
				style={{ margin: "1rem", padding: "1.5rem" }}>
				<div
					style={{
						display: "flex",
						flexDirection: window.innerWidth < 1024 ? "column" : "row",
						alignItems: window.innerWidth < 1024 ? "flex-start" : "center",
						justifyContent: "space-between",
						gap: "1rem",
					}}>
					<div
						style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<Shield size={32} style={{ color: "var(--accent-primary)" }} />
						<h1
							style={{
								fontSize: "2rem",
								fontWeight: "700",
								margin: 0,
								background: "var(--gradient-primary)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
							}}>
							Sentinel Shield
						</h1>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								marginLeft: "1rem",
							}}>
							<div
								style={{
									width: "8px",
									height: "8px",
									backgroundColor: "#10b981",
									borderRadius: "50%",
									animation: "pulse 2s infinite",
								}}></div>
							<span
								style={{
									fontSize: "0.875rem",
									color: "var(--text-secondary)",
								}}>
								Live Monitoring
							</span>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: window.innerWidth < 640 ? "column" : "row",
							alignItems: "center",
							gap: "1rem",
							width: window.innerWidth < 1024 ? "100%" : "auto",
						}}>
						{/* Search */}
						<div
							style={{
								position: "relative",
								width: window.innerWidth < 640 ? "100%" : "320px",
							}}>
							<form onSubmit={handleSubmit} style={{ display: "flex" }}>
								<div style={{ position: "relative", flex: 1 }}>
									<Search
										size={16}
										style={{
											position: "absolute",
											left: "12px",
											top: "50%",
											transform: "translateY(-50%)",
											color: "var(--text-muted)",
										}}
									/>
									<input
										type='text'
										value={input}
										onChange={handleInputChange}
										placeholder='Search stocks (e.g., RELIANCE.NSE)'
										style={{
											width: "100%",
											paddingLeft: "2.5rem",
											paddingRight: "1rem",
											padding: "12px",
											backgroundColor: "var(--bg-elevated)",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px 0 0 8px",
											color: "var(--text-primary)",
											fontSize: "0.875rem",
										}}
									/>

									{suggestions.length > 0 && (
										<div
											style={{
												position: "absolute",
												zIndex: 50,
												top: "100%",
												left: 0,
												right: 0,
												backgroundColor: "var(--bg-elevated)",
												border: "1px solid var(--border-primary)",
												borderRadius: "8px",
												marginTop: "4px",
												boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
												maxHeight: "240px",
												overflowY: "auto",
											}}>
											{suggestions.map((s, i) => (
												<div
													key={i}
													onClick={() => handleSuggestionClick(s)}
													style={{
														padding: "12px 16px",
														cursor: "pointer",
														borderBottom:
															i < suggestions.length - 1
																? "1px solid var(--border-primary)"
																: "none",
														transition: "background-color 0.2s ease",
													}}
													onMouseEnter={(e) =>
														(e.target.style.backgroundColor =
															"var(--bg-secondary)")
													}
													onMouseLeave={(e) =>
														(e.target.style.backgroundColor = "transparent")
													}>
													<div
														style={{
															fontWeight: "500",
															color: "var(--text-primary)",
															marginBottom: "2px",
														}}>
														{s.symbol}.{s.exchange}
													</div>
													<div
														style={{
															fontSize: "0.75rem",
															color: "var(--text-muted)",
														}}>
														{s.instrument_name}
													</div>
												</div>
											))}
										</div>
									)}
								</div>

								<button
									type='submit'
									disabled={loading}
									style={{
										padding: "12px 16px",
										backgroundColor: loading
											? "var(--text-muted)"
											: "var(--accent-primary)",
										color: "white",
										border: "none",
										borderRadius: "0 8px 8px 0",
										cursor: loading ? "not-allowed" : "pointer",
										display: "flex",
										alignItems: "center",
										transition: "all 0.2s ease",
									}}
									onMouseEnter={(e) =>
										!loading &&
										(e.target.style.backgroundColor = "var(--accent-secondary)")
									}
									onMouseLeave={(e) =>
										!loading &&
										(e.target.style.backgroundColor = "var(--accent-primary)")
									}>
									{loading ? (
										<RefreshCw
											size={16}
											style={{ animation: "spin 1s linear infinite" }}
										/>
									) : (
										"Search"
									)}
								</button>
							</form>
						</div>

						{/* Auto-refresh toggle */}
						<div
							style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<input
								type='checkbox'
								id='autoRefresh'
								checked={isAutoRefresh}
								onChange={(e) => setIsAutoRefresh(e.target.checked)}
								style={{
									accentColor: "var(--accent-primary)",
									transform: "scale(1.1)",
								}}
							/>
							<label
								htmlFor='autoRefresh'
								style={{
									fontSize: "0.875rem",
									color: "var(--text-secondary)",
								}}>
								Auto-refresh
							</label>
						</div>
					</div>
				</div>

				{error && (
					<div
						style={{
							marginTop: "1rem",
							padding: "1rem",
							backgroundColor: "rgba(239, 68, 68, 0.1)",
							border: "1px solid rgba(239, 68, 68, 0.3)",
							borderRadius: "8px",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
						}}>
						<AlertTriangle size={20} style={{ color: "#ef4444" }} />
						<span style={{ color: "#ef4444" }}>{error}</span>
					</div>
				)}
			</header>

			{/* Main Content */}
			<div style={{ padding: "0 1rem 1rem 1rem" }}>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: window.innerWidth >= 1280 ? "3fr 1fr" : "1fr",
						gap: "1.5rem",
					}}>
					{/* Left Column - Main Dashboard */}
					<div
						style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
						{/* Stats Cards */}
						{data && (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: `repeat(${
										window.innerWidth >= 768
											? window.innerWidth >= 1024
												? 4
												: 2
											: 1
									}, 1fr)`,
									gap: "1rem",
								}}>
								<StatsCard
									title='Current Price'
									value={formatCurrency(data.price)}
									icon={TrendingUp}
									color='blue'
								/>
								<StatsCard
									title='Volume'
									value={formatNumber(data.volume)}
									icon={BarChart3}
									color='green'
								/>
								<StatsCard
									title='Risk Level'
									value={data.severity_level}
									icon={AlertTriangle}
									color='orange'
								/>
								<StatsCard
									title='ML Confidence'
									value={`${data.manipulation_confidence || 0}%`}
									icon={Activity}
									color='purple'
								/>
							</div>
						)}

						{/* Chart Section */}
						{data && (
							<div
								className='glass-card animate-fade-in'
								style={{ padding: "1.5rem" }}>
								<div
									style={{
										display: "flex",
										flexDirection: window.innerWidth >= 1024 ? "row" : "column",
										alignItems:
											window.innerWidth >= 1024 ? "center" : "flex-start",
										justifyContent: "space-between",
										marginBottom: "1.5rem",
										gap: "1rem",
									}}>
									<div>
										<h2
											style={{
												fontSize: "1.25rem",
												fontWeight: "700",
												color: "var(--text-primary)",
												margin: 0,
												marginBottom: "0.5rem",
											}}>
											{data.symbol} - Live Price Chart
										</h2>
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												alignItems: "center",
												gap: "1rem",
												fontSize: "0.875rem",
												color: "var(--text-secondary)",
											}}>
											<span>
												Price:{" "}
												<strong style={{ color: "var(--text-primary)" }}>
													{formatCurrency(data.price)}
												</strong>
											</span>
											<span>
												Volume:{" "}
												<strong style={{ color: "var(--text-primary)" }}>
													{formatNumber(data.volume)}
												</strong>
											</span>
											<span
												style={{
													fontWeight: "600",
													color: getSeverityColor(data.severity_level).replace(
														"text-",
														""
													),
												}}>
												{data.risk_reason || "Normal"}
											</span>
										</div>
									</div>

									{data.manipulation_confidence > 50 && (
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
												padding: "0.5rem 1rem",
												backgroundColor: "rgba(239, 68, 68, 0.1)",
												borderRadius: "8px",
												border: "1px solid rgba(239, 68, 68, 0.3)",
											}}>
											<Bell
												size={20}
												style={{
													color: "#ef4444",
													animation: "bounce 1s infinite",
												}}
											/>
											<span style={{ color: "#ef4444", fontWeight: "600" }}>
												High Risk: {data.manipulation_confidence}%
											</span>
										</div>
									)}
								</div>

								<div className='chart-container' style={{ padding: "1rem" }}>
									<div
										id='chart'
										style={{ width: "100%", height: "320px" }}></div>
								</div>

								{/* Technical Indicators */}
								<div
									style={{
										display: "grid",
										gridTemplateColumns: `repeat(${
											window.innerWidth >= 768 ? 3 : 1
										}, 1fr)`,
										gap: "1rem",
										marginTop: "1.5rem",
									}}>
									<div
										style={{
											backgroundColor: "var(--bg-secondary)",
											borderRadius: "8px",
											padding: "1rem",
										}}>
										<div
											style={{
												fontSize: "0.875rem",
												color: "var(--text-muted)",
												marginBottom: "0.25rem",
											}}>
											EWMA Z-Score
										</div>
										<div
											style={{
												fontSize: "1.125rem",
												fontWeight: "700",
												color: "var(--text-primary)",
											}}>
											{data.ewma_zscore?.toFixed(2)}
										</div>
									</div>
									<div
										style={{
											backgroundColor: "var(--bg-secondary)",
											borderRadius: "8px",
											padding: "1rem",
										}}>
										<div
											style={{
												fontSize: "0.875rem",
												color: "var(--text-muted)",
												marginBottom: "0.25rem",
											}}>
											Volume Ratio
										</div>
										<div
											style={{
												fontSize: "1.125rem",
												fontWeight: "700",
												color: "var(--text-primary)",
											}}>
											{data.volume_ratio?.toFixed(2)}x
										</div>
									</div>
									<div
										style={{
											backgroundColor: "var(--bg-secondary)",
											borderRadius: "8px",
											padding: "1rem",
										}}>
										<div
											style={{
												fontSize: "0.875rem",
												color: "var(--text-muted)",
												marginBottom: "0.25rem",
											}}>
											ML Score
										</div>
										<div
											style={{
												fontSize: "1.125rem",
												fontWeight: "700",
												color: "var(--text-primary)",
											}}>
											{data.ml_score?.toFixed(3)}
										</div>
									</div>
								</div>

								{/* Social Signals */}
								{data.social_signals && data.social_signals.length > 0 && (
									<div style={{ marginTop: "1.5rem" }}>
										<h3
											style={{
												fontSize: "1.125rem",
												fontWeight: "600",
												color: "var(--text-primary)",
												marginBottom: "0.75rem",
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
											}}>
											<Globe size={20} />
											Social Media Signals ({data.social_signals.length})
										</h3>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "0.75rem",
												maxHeight: "240px",
												overflowY: "auto",
											}}>
											{data.social_signals.slice(0, 5).map((signal, i) => (
												<div
													key={i}
													style={{
														backgroundColor: "var(--bg-secondary)",
														borderRadius: "8px",
														padding: "0.75rem",
														borderLeft: `3px solid ${
															signal.manipulation_confidence > 0.7
																? "#ef4444"
																: signal.manipulation_confidence > 0.4
																? "#f59e0b"
																: "#10b981"
														}`,
													}}>
													<div
														style={{
															display: "flex",
															justifyContent: "space-between",
															alignItems: "flex-start",
															marginBottom: "0.5rem",
														}}>
														<span
															style={{
																fontWeight: "500",
																color: "var(--text-primary)",
															}}>
															{signal.channel}
														</span>
														<span
															style={{
																fontSize: "0.75rem",
																padding: "0.125rem 0.5rem",
																borderRadius: "4px",
																backgroundColor:
																	signal.manipulation_confidence > 0.7
																		? "rgba(239, 68, 68, 0.2)"
																		: signal.manipulation_confidence > 0.4
																		? "rgba(245, 158, 11, 0.2)"
																		: "rgba(16, 185, 129, 0.2)",
																color:
																	signal.manipulation_confidence > 0.7
																		? "#ef4444"
																		: signal.manipulation_confidence > 0.4
																		? "#f59e0b"
																		: "#10b981",
															}}>
															{(signal.manipulation_confidence * 100).toFixed(
																0
															)}
															% risk
														</span>
													</div>
													<p
														style={{
															fontSize: "0.875rem",
															color: "var(--text-secondary)",
															margin: "0 0 0.5rem 0",
															lineHeight: "1.4",
														}}>
														{signal.message}
													</p>
													<div
														style={{
															fontSize: "0.75rem",
															color: "var(--text-muted)",
														}}>
														{new Date(signal.timestamp).toLocaleTimeString()}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Investigation Hub */}
						<div className='glass-card' style={{ padding: "1.5rem" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: "1rem",
								}}>
								<h2
									style={{
										fontSize: "1.25rem",
										fontWeight: "700",
										color: "var(--text-primary)",
										margin: 0,
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
									}}>
									<Eye size={20} />
									Investigation Hub
								</h2>
								<button
									onClick={() => setIsInvestigationOpen(!isInvestigationOpen)}
									style={{
										color: "var(--accent-primary)",
										backgroundColor: "transparent",
										border: "none",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "0.25rem",
										padding: "0.5rem",
										borderRadius: "4px",
										transition: "background-color 0.2s ease",
									}}
									onMouseEnter={(e) =>
										(e.target.style.backgroundColor = "var(--bg-secondary)")
									}
									onMouseLeave={(e) =>
										(e.target.style.backgroundColor = "transparent")
									}>
									<Filter size={16} />
									{isInvestigationOpen ? "Hide Filters" : "Show Filters"}
								</button>
							</div>

							{isInvestigationOpen && (
								<form
									onSubmit={runInvestigation}
									style={{
										display: "grid",
										gridTemplateColumns: `repeat(${
											window.innerWidth >= 1024
												? 6
												: window.innerWidth >= 768
												? 2
												: 1
										}, 1fr)`,
										gap: "1rem",
										marginBottom: "1.5rem",
									}}>
									<input
										placeholder='Symbol (e.g., RELIANCE.NSE)'
										value={invSymbol}
										onChange={(e) => setInvSymbol(e.target.value)}
										style={{
											padding: "0.75rem",
											backgroundColor: "var(--bg-elevated)",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											color: "var(--text-primary)",
										}}
									/>
									<input
										placeholder='Source Handle'
										value={invHandle}
										onChange={(e) => setInvHandle(e.target.value)}
										style={{
											padding: "0.75rem",
											backgroundColor: "var(--bg-elevated)",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											color: "var(--text-primary)",
										}}
									/>
									<input
										type='datetime-local'
										value={invFrom}
										onChange={(e) => setInvFrom(e.target.value)}
										style={{
											padding: "0.75rem",
											backgroundColor: "var(--bg-elevated)",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											color: "var(--text-primary)",
										}}
									/>
									<input
										type='datetime-local'
										value={invTo}
										onChange={(e) => setInvTo(e.target.value)}
										style={{
											padding: "0.75rem",
											backgroundColor: "var(--bg-elevated)",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											color: "var(--text-primary)",
										}}
									/>
									<input
										type='number'
										placeholder='Limit'
										value={invLimit}
										onChange={(e) => setInvLimit(e.target.value)}
										style={{
											padding: "0.75rem",
											backgroundColor: "var(--bg-elevated)",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											color: "var(--text-primary)",
										}}
									/>
									<div style={{ display: "flex", gap: "0.5rem" }}>
										<button
											type='submit'
											disabled={loading}
											style={{
												flex: 1,
												padding: "0.75rem 1rem",
												backgroundColor: loading
													? "var(--text-muted)"
													: "var(--accent-primary)",
												color: "white",
												border: "none",
												borderRadius: "8px",
												cursor: loading ? "not-allowed" : "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.5rem",
												transition: "background-color 0.2s ease",
											}}>
											{loading ? (
												<RefreshCw
													size={16}
													style={{ animation: "spin 1s linear infinite" }}
												/>
											) : (
												<Search size={16} />
											)}
											Search
										</button>
										<button
											type='button'
											onClick={downloadCSV}
											style={{
												padding: "0.75rem",
												backgroundColor: "var(--accent-success)",
												color: "white",
												border: "none",
												borderRadius: "8px",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
											}}>
											<Download size={16} />
										</button>
									</div>
								</form>
							)}

							{/* Investigation Results */}
							<div>
								{invResults.length === 0 ? (
									<div
										style={{
											textAlign: "center",
											padding: "2rem 0",
											color: "var(--text-muted)",
										}}>
										<Eye
											size={48}
											style={{ margin: "0 auto 0.75rem auto", opacity: 0.5 }}
										/>
										<p>
											No investigation results. Use the filters above to search
											past alerts.
										</p>
									</div>
								) : (
									<div
										style={{
											display: "grid",
											gridTemplateColumns: `repeat(${
												window.innerWidth >= 1024
													? 3
													: window.innerWidth >= 768
													? 2
													: 1
											}, 1fr)`,
											gap: "1rem",
										}}>
										{invResults.map((result) => (
											<AlertCard
												key={result.id}
												alert={result}
												onClick={openAlertDetail}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Right Sidebar */}
					{window.innerWidth >= 1280 && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "1.5rem",
							}}>
							{/* Threat Meter */}
							<ThreatMeter threat={threat} />

							{/* Live Alert Feed */}
							<div className='glass-card' style={{ padding: "1.5rem" }}>
								<h3
									style={{
										fontSize: "1.125rem",
										fontWeight: "700",
										color: "var(--text-primary)",
										marginBottom: "1rem",
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
									}}>
									<Bell size={20} style={{ color: "#ef4444" }} />
									Live Alert Feed
								</h3>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
										maxHeight: "320px",
										overflowY: "auto",
									}}>
									{liveAlerts.length === 0 ? (
										<div
											style={{
												textAlign: "center",
												padding: "1rem 0",
												color: "var(--text-muted)",
											}}>
											<Activity
												size={32}
												style={{ margin: "0 auto 0.5rem auto", opacity: 0.5 }}
											/>
											<p style={{ fontSize: "0.875rem" }}>No recent alerts</p>
										</div>
									) : (
										liveAlerts.slice(0, 5).map((alert) => (
											<div
												key={alert.id}
												onClick={() => openAlertDetail(alert)}
												style={{
													padding: "0.75rem",
													backgroundColor: "var(--bg-secondary)",
													borderRadius: "8px",
													cursor: "pointer",
													transition: "background-color 0.2s ease",
												}}
												onMouseEnter={(e) =>
													(e.target.style.backgroundColor =
														"var(--bg-tertiary)")
												}
												onMouseLeave={(e) =>
													(e.target.style.backgroundColor =
														"var(--bg-secondary)")
												}>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														justifyContent: "space-between",
														marginBottom: "0.5rem",
													}}>
													<span
														style={{
															fontWeight: "600",
															color: "var(--accent-primary)",
														}}>
														{alert.symbol}
													</span>
													<span
														style={{
															padding: "0.125rem 0.5rem",
															borderRadius: "4px",
															fontSize: "0.75rem",
															fontWeight: "600",
															backgroundColor:
																alert.severity_level >= 3
																	? "#ef4444"
																	: alert.severity_level >= 2
																	? "#f59e0b"
																	: alert.severity_level >= 1
																	? "#eab308"
																	: "#10b981",
															color: "white",
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

												<p
													style={{
														fontSize: "0.875rem",
														color: "var(--text-secondary)",
														marginBottom: "0.5rem",
														lineHeight: "1.3",
														overflow: "hidden",
														textOverflow: "ellipsis",
														display: "-webkit-box",
														WebkitLineClamp: 2,
														WebkitBoxOrient: "vertical",
													}}>
													{alert.reason}
												</p>

												<div
													style={{
														display: "flex",
														justifyContent: "space-between",
														fontSize: "0.75rem",
														color: "var(--text-muted)",
													}}>
													<span>Trust: {alert.trust_score}</span>
													{alert.manipulation_confidence && (
														<span>{alert.manipulation_confidence}% conf.</span>
													)}
												</div>
											</div>
										))
									)}
								</div>

								{liveAlerts.length > 5 && (
									<div style={{ marginTop: "1rem", textAlign: "center" }}>
										<button
											style={{
												color: "var(--accent-primary)",
												backgroundColor: "transparent",
												border: "none",
												fontSize: "0.875rem",
												fontWeight: "500",
												cursor: "pointer",
											}}>
											View all {liveAlerts.length} alerts →
										</button>
									</div>
								)}
							</div>

							{/* Leaderboard */}
							<div className='glass-card' style={{ padding: "1.5rem" }}>
								<h3
									style={{
										fontSize: "1.125rem",
										fontWeight: "700",
										color: "var(--text-primary)",
										marginBottom: "1rem",
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
									}}>
									<TrendingUp size={20} style={{ color: "#f59e0b" }} />
									Most Manipulated (24h)
								</h3>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
									}}>
									{leaderboard.length === 0 ? (
										<div
											style={{
												textAlign: "center",
												padding: "1rem 0",
												color: "var(--text-muted)",
											}}>
											<BarChart3
												size={32}
												style={{ margin: "0 auto 0.5rem auto", opacity: 0.5 }}
											/>
											<p style={{ fontSize: "0.875rem" }}>No data available</p>
										</div>
									) : (
										leaderboard.map((item, index) => (
											<div
												key={index}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													padding: "0.75rem",
													backgroundColor: "var(--bg-secondary)",
													borderRadius: "8px",
												}}>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "0.75rem",
													}}>
													<div
														style={{
															width: "24px",
															height: "24px",
															borderRadius: "50%",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															fontSize: "0.75rem",
															fontWeight: "700",
															backgroundColor:
																index === 0
																	? "#eab308"
																	: index === 1
																	? "#9ca3af"
																	: index === 2
																	? "#ea580c"
																	: "#6b7280",
															color: "white",
														}}>
														{index + 1}
													</div>
													<span
														style={{
															fontWeight: "600",
															color: "var(--accent-primary)",
														}}>
														{item.symbol}
													</span>
												</div>
												<span
													style={{
														fontSize: "0.875rem",
														color: "var(--text-secondary)",
													}}>
													{item.count} alerts
												</span>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Alert Detail Modal */}
			{selectedAlert && alertDetail && (
				<div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4'>
					<div className='bg-white rounded-xl max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 w-full'>
						<div className='sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl'>
							<div className='flex justify-between items-center'>
								<h2 className='text-2xl font-bold text-gray-900 flex items-center gap-3'>
									<AlertTriangle className='h-6 w-6 text-red-500' />
									Alert Deep Dive — {alertDetail.alert.symbol}
								</h2>
								<button
									onClick={closeDetail}
									className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
									<X className='h-6 w-6 text-gray-500' />
								</button>
							</div>
						</div>

						<div className='p-6'>
							<div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
								{/* Left Section - Chart and Alert Info */}
								<div style={{ flex: "1 1 400px", minWidth: "400px" }}>
									<div className='bg-gray-50 rounded-lg p-4 mb-6'>
										<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
											<BarChart3 className='h-5 w-5' />
											Price Chart Analysis
										</h3>
										<div
											id='deep_chart'
											style={{
												width: "100%",
												height: "300px",
												backgroundColor: "white",
												borderRadius: "8px",
												border: "1px solid #e5e7eb",
											}}></div>
									</div>

									<div className='bg-gray-50 rounded-lg p-4'>
										<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
											<Info className='h-5 w-5' />
											Alert Information
										</h3>
										<div className='space-y-3 text-sm'>
											<div className='flex justify-between'>
												<span className='font-medium text-gray-600'>
													Alert Time:
												</span>
												<span className='text-gray-900'>
													{new Date(alertDetail.alert.time).toLocaleString()}
												</span>
											</div>
											<div className='flex justify-between'>
												<span className='font-medium text-gray-600'>
													Source:
												</span>
												<div className='text-right'>
													<span className='text-gray-900'>
														{alertDetail.alert.source_handle}
													</span>
													<span
														className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
															alertDetail.alert.registered
																? "bg-green-100 text-green-800"
																: "bg-yellow-100 text-yellow-800"
														}`}>
														{alertDetail.alert.registered
															? "Verified"
															: "Unverified"}
													</span>
												</div>
											</div>
											<div className='flex justify-between'>
												<span className='font-medium text-gray-600'>
													Trust Score:
												</span>
												<span className='text-gray-900 font-semibold'>
													{alertDetail.alert.trust_score}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Right Section - Metrics and Details */}
								<div style={{ flex: "1 1 320px", minWidth: "320px" }}>
									<div className='bg-gray-50 rounded-lg p-4 mb-6'>
										<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
											<Activity className='h-5 w-5' />
											Alert Metrics
										</h3>
										<div className='grid grid-cols-2 gap-4'>
											<div className='bg-white rounded-lg p-3 border border-gray-200'>
												<div className='text-xs text-gray-500 mb-1'>Price</div>
												<div className='text-lg font-bold text-gray-900'>
													₹{alertDetail.alert.price}
												</div>
											</div>
											<div className='bg-white rounded-lg p-3 border border-gray-200'>
												<div className='text-xs text-gray-500 mb-1'>Volume</div>
												<div className='text-lg font-bold text-gray-900'>
													{alertDetail.alert.volume?.toLocaleString()}
												</div>
											</div>
											<div className='bg-white rounded-lg p-3 border border-gray-200'>
												<div className='text-xs text-gray-500 mb-1'>
													Severity
												</div>
												<span
													className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${
														alertDetail.alert.severity_level >= 3
															? "bg-red-500"
															: alertDetail.alert.severity_level >= 2
															? "bg-orange-500"
															: alertDetail.alert.severity_level >= 1
															? "bg-yellow-500"
															: "bg-green-500"
													}`}>
													Level {alertDetail.alert.severity_level || 1}
												</span>
											</div>
											<div className='bg-white rounded-lg p-3 border border-gray-200'>
												<div className='text-xs text-gray-500 mb-1'>
													Confidence
												</div>
												<div className='text-lg font-bold text-gray-900'>
													{alertDetail.alert.manipulation_confidence || "N/A"}%
												</div>
											</div>
											<div className='bg-white rounded-lg p-3 border border-gray-200 col-span-2'>
												<div className='text-xs text-gray-500 mb-1'>
													ML Detection
												</div>
												<div className='flex justify-between items-center'>
													<span
														className={`font-bold ${
															alertDetail.alert.ml_flag
																? "text-red-600"
																: "text-green-600"
														}`}>
														{alertDetail.alert.ml_flag ? "DETECTED" : "Clear"}
													</span>
													<span className='text-sm text-gray-600'>
														Score:{" "}
														{alertDetail.alert.ml_score?.toFixed
															? alertDetail.alert.ml_score.toFixed(3)
															: alertDetail.alert.ml_score || "N/A"}
													</span>
												</div>
											</div>
										</div>

										<div className='mt-4 p-3 bg-white rounded-lg border border-gray-200'>
											<div className='text-xs text-gray-500 mb-1'>Reason</div>
											<div className='text-sm text-gray-900'>
												{alertDetail.alert.reason}
											</div>
										</div>
									</div>

									{/* Social Media Intelligence */}
									<div className='bg-gray-50 rounded-lg p-4'>
										<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
											<Globe className='h-5 w-5' />
											Social Media Intelligence
											<span className='ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full'>
												{alertDetail.alert.social_signals_count || 0} signals
											</span>
										</h3>

										<div className='max-h-64 overflow-y-auto space-y-3'>
											{alertDetail.social_snippets?.length > 0 ? (
												alertDetail.social_snippets.map((signal, i) => (
													<div
														key={i}
														className='bg-white rounded-lg p-3 border-l-4'
														style={{
															borderLeftColor:
																signal.manipulation_confidence > 0.7
																	? "#ef4444"
																	: signal.manipulation_confidence > 0.4
																	? "#f59e0b"
																	: "#10b981",
														}}>
														<div className='flex justify-between items-start mb-2'>
															<div className='flex items-center gap-2'>
																<span className='font-medium text-gray-900'>
																	{signal.handle}
																</span>
																<span className='px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded'>
																	{signal.platform}
																</span>
															</div>
															<span
																className={`px-2 py-1 text-xs font-bold rounded text-white ${
																	signal.manipulation_confidence > 0.7
																		? "bg-red-500"
																		: signal.manipulation_confidence > 0.4
																		? "bg-yellow-500"
																		: "bg-green-500"
																}`}>
																{(signal.manipulation_confidence * 100).toFixed(
																	0
																)}
																%
															</span>
														</div>

														<p className='text-sm text-gray-700 mb-2 leading-relaxed'>
															{signal.text}
														</p>

														<div className='flex justify-between text-xs text-gray-500'>
															<span>
																{new Date(signal.ts).toLocaleTimeString()}
															</span>
															<span>
																Sentiment:{" "}
																{(signal.sentiment_score * 100).toFixed(0)}%
															</span>
														</div>
													</div>
												))
											) : (
												<div className='text-center py-4 text-gray-500'>
													<Globe className='h-8 w-8 mx-auto mb-2 opacity-50' />
													<p className='text-sm'>No social signals detected</p>
												</div>
											)}
										</div>
									</div>

									{/* Entity Verification */}
									{alertDetail.entity_verification && (
										<div className='bg-gray-50 rounded-lg p-4 mt-4'>
											<h4 className='font-semibold text-gray-900 mb-3'>
												Entity Verification
											</h4>
											<div className='flex flex-wrap gap-2'>
												<span className='px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full'>
													✓ {alertDetail.entity_verification.verified_entities}{" "}
													Verified
												</span>
												<span className='px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full'>
													⚠{" "}
													{alertDetail.entity_verification.unverified_entities}{" "}
													Unverified
												</span>
												<span className='px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full'>
													⚡ {alertDetail.entity_verification.high_risk_sources}{" "}
													High Risk
												</span>
											</div>
										</div>
									)}

									{/* Coordination Analysis */}
									{alertDetail.coordination_analysis && (
										<div className='bg-gray-50 rounded-lg p-4 mt-4'>
											<h4 className='font-semibold text-gray-900 mb-2'>
												Coordination Analysis
											</h4>
											<p className='text-sm text-gray-700 leading-relaxed'>
												{alertDetail.coordination_analysis.network_analysis}
											</p>
										</div>
									)}

									{/* Action Buttons */}
									<div className='mt-6 flex gap-3'>
										<button className='flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2'>
											<Download className='h-4 w-4' />
											Download Report
										</button>
										<button className='px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors'>
											Share
										</button>
									</div>
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
