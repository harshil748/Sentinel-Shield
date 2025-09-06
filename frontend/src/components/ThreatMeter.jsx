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
			className='bg-white dark:bg-gray-800 rounded-full shadow-lg p-8 border border-gray-200 dark:border-gray-700 aspect-square flex flex-col items-center justify-center text-center'
			style={{ background: getBackgroundGradient() }}>
			<h3 className='text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center justify-center'>
				<div className='w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse'></div>
				Market Threat Level
			</h3>

			<div className='flex flex-col items-center justify-center space-y-4'>
				<div className='w-28 h-28'>
					<CircularProgressbar
						value={threat.score}
						text={`${threat.score}`}
						styles={buildStyles({
							pathColor: getColor(),
							textColor: getColor(),
							trailColor: "#e5e7eb",
							textSize: "18px",
							pathTransitionDuration: 1.5,
						})}
					/>
				</div>

				<div className='text-center'>
					<div className='mb-3'>
						<span className='text-xl font-bold' style={{ color: getColor() }}>
							{threat.level}
						</span>
					</div>

					{threat.details && (
						<div className='space-y-2 text-xs text-gray-600 dark:text-gray-400'>
							<div className='flex justify-between items-center'>
								<span>Total Alerts:</span>
								<span className='font-semibold ml-2'>
									{threat.details.total_recent_alerts}
								</span>
							</div>
							<div className='flex justify-between items-center'>
								<span>High Severity:</span>
								<span className='font-semibold text-red-500 ml-2'>
									{threat.details.high_severity_alerts}
								</span>
							</div>
							<div className='flex justify-between items-center'>
								<span>Last Hour:</span>
								<span className='font-semibold text-orange-500 ml-2'>
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
