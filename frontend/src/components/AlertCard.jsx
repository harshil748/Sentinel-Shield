import React from "react";
import {
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Activity,
} from "lucide-react";

const AlertCard = ({ alert, onClick }) => {
	const getSeverityColor = (level) => {
		switch (level) {
			case 4:
				return "bg-red-500 text-white border-red-600";
			case 3:
				return "bg-red-400 text-white border-red-500";
			case 2:
				return "bg-orange-400 text-white border-orange-500";
			case 1:
				return "bg-yellow-400 text-black border-yellow-500";
			default:
				return "bg-green-400 text-white border-green-500";
		}
	};

	const getSeverityLabel = (level) => {
		switch (level) {
			case 4:
				return "CRITICAL";
			case 3:
				return "HIGH";
			case 2:
				return "MEDIUM";
			case 1:
				return "LOW";
			default:
				return "INFO";
		}
	};

	const formatTime = (timestamp) => {
		return new Date(timestamp).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	return (
		<div
			className='bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 cursor-pointer'
			onClick={() => onClick && onClick(alert)}>
			<div className='p-4'>
				<div className='flex items-center justify-between mb-3'>
					<div className='flex items-center space-x-2'>
						<AlertTriangle className='h-5 w-5 text-orange-500' />
						<span className='font-bold text-lg text-blue-600'>
							{alert.symbol}
						</span>
					</div>
					<span
						className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(
							alert.severity_level
						)}`}>
						{getSeverityLabel(alert.severity_level)}
					</span>
				</div>

				<div className='grid grid-cols-2 gap-3 mb-3 text-sm'>
					<div>
						<span className='text-gray-600 dark:text-gray-400'>Price:</span>
						<span className='ml-1 font-semibold'>₹{alert.price}</span>
					</div>
					<div>
						<span className='text-gray-600 dark:text-gray-400'>Time:</span>
						<span className='ml-1'>{formatTime(alert.time)}</span>
					</div>
				</div>

				<div className='mb-3'>
					<p className='text-sm text-gray-700 dark:text-gray-300 line-clamp-2'>
						{alert.reason}
					</p>
				</div>

				<div className='flex items-center justify-between text-xs'>
					<div className='flex items-center space-x-3'>
						<span className='flex items-center'>
							<Activity className='h-4 w-4 mr-1 text-blue-500' />
							Trust: {alert.trust_score}
						</span>
						{alert.manipulation_confidence && (
							<span
								className={`font-semibold ${
									alert.manipulation_confidence > 70
										? "text-red-500"
										: alert.manipulation_confidence > 40
										? "text-orange-500"
										: "text-green-500"
								}`}>
								{alert.manipulation_confidence}% conf.
							</span>
						)}
					</div>
					<div className='text-gray-500'>
						{alert.registered ? "✓ Verified" : "⚠ Unverified"}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AlertCard;
