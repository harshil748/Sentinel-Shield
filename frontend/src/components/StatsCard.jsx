import React from "react";
import { TrendingUp } from "lucide-react";

const StatsCard = ({ title, value, change, icon: Icon, color = "blue" }) => {
	const colorClasses = {
		blue: "text-blue-600 bg-blue-100",
		green: "text-green-600 bg-green-100",
		red: "text-red-600 bg-red-100",
		orange: "text-orange-600 bg-orange-100",
		purple: "text-purple-600 bg-purple-100",
	};

	return (
		<div className='bg-white dark:bg-gray-800 rounded-full shadow-md p-8 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 aspect-square flex flex-col items-center justify-center text-center'>
			<div className={`p-4 rounded-full mb-4 ${colorClasses[color]}`}>
				<Icon className='h-8 w-8' />
			</div>
			<div>
				<p className='text-xs text-gray-600 dark:text-gray-400 mb-2'>{title}</p>
				<p className='text-xl font-bold text-gray-900 dark:text-white mb-1'>
					{value}
				</p>
				{change !== undefined && (
					<p
						className={`text-xs ${
							change >= 0 ? "text-green-600" : "text-red-600"
						} flex items-center justify-center`}>
						<TrendingUp
							className={`h-3 w-3 mr-1 ${change < 0 ? "rotate-180" : ""}`}
						/>
						{Math.abs(change)}%
					</p>
				)}
			</div>
		</div>
	);
};

export default StatsCard;
