import React from "react";

export default function Card({ title, icon, children, actions, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-sm border p-4 ${className || "bg-white dark:bg-gray-800"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-lg">
          {icon}
          <span>{title}</span>
        </div>
        {actions}
      </div>
      <div>{children}</div>
    </div>
  );
}
