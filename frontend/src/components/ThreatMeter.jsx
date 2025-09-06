import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

const ThreatMeter = ({ threat }) => {
	const getColor = () => {
		if (threat.score >= 80) return "#dc2626";
		if (threat.score >= 60) return "#ea580c";
		if (threat.score >= 35) return "#f59e0b";
		if (threat.score >= 15) return "#eab308";
		return "#22c55e";
	};

	const getBackgroundGradient = () => {
		const color = getColor();
		return `linear-gradient(135deg, ${color}20, ${color}10)`;
	};

	return (
		<div
			className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'
			style={{ background: getBackgroundGradient() }}>
			<h3 className='text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center'>
				<div className='w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse'></div>
				Market Threat Level
			</h3>

			<div className='flex items-center justify-center space-x-6'>
				<div className='w-24 h-24'>
					<CircularProgressbar
						value={threat.score}
						text={`${threat.score}`}
						styles={buildStyles({
							pathColor: getColor(),
							textColor: getColor(),
							trailColor: "#e5e7eb",
							textSize: "20px",
							pathTransitionDuration: 1.5,
						})}
					/>
				</div>

				<div className='flex-1'>
					<div className='mb-2'>
						<span className='text-2xl font-bold' style={{ color: getColor() }}>
							{threat.level}
						</span>
					</div>

					{threat.details && (
						<div className='space-y-1 text-sm text-gray-600 dark:text-gray-400'>
							<div className='flex justify-between'>
								<span>Total Alerts:</span>
								<span className='font-semibold'>
									{threat.details.total_recent_alerts}
								</span>
							</div>
							<div className='flex justify-between'>
								<span>High Severity:</span>
								<span className='font-semibold text-red-500'>
									{threat.details.high_severity_alerts}
								</span>
							</div>
							<div className='flex justify-between'>
								<span>Last Hour:</span>
								<span className='font-semibold text-orange-500'>
									{threat.details.alerts_last_hour}
								</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ThreatMeter;
