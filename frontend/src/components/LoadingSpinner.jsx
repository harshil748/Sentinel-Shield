import React from "react";

const LoadingSpinner = ({ size = "medium", text = "Loading..." }) => {
	const sizeClasses = {
		small: "w-4 h-4",
		medium: "w-8 h-8",
		large: "w-12 h-12",
	};

	return (
		<div className='flex flex-col items-center justify-center p-4'>
			<div
				className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}></div>
			{text && <p className='mt-2 text-sm text-gray-600'>{text}</p>}
		</div>
	);
};

export default LoadingSpinner;
