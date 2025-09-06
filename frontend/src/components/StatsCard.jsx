import React from "react";
import { TrendingUp, Activity, Users } from "lucide-react";

const StatsCard = ({ title, value, change, icon: Icon, color = "blue" }) => {
	const colorClasses = {
		blue: "text-blue-600 bg-blue-100",
		green: "text-green-600 bg-green-100",
		red: "text-red-600 bg-red-100",
		orange: "text-orange-600 bg-orange-100",
		purple: "text-purple-600 bg-purple-100",
	};

	return (
		<div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200'>
			<div className='flex items-center justify-between'>
				<div>
					<p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
						{title}
					</p>
					<p className='text-2xl font-bold text-gray-900 dark:text-white'>
						{value}
					</p>
					{change !== undefined && (
						<p
							className={`text-sm ${
								change >= 0 ? "text-green-600" : "text-red-600"
							} flex items-center mt-1`}>
							<TrendingUp
								className={`h-4 w-4 mr-1 ${change < 0 ? "rotate-180" : ""}`}
							/>
							{Math.abs(change)}%
						</p>
					)}
				</div>
				<div className={`p-3 rounded-full ${colorClasses[color]}`}>
					<Icon className='h-6 w-6' />
				</div>
			</div>
		</div>
	);
};

export default StatsCard;
