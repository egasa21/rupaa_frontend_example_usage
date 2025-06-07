"use client";

import { Minus, X } from "lucide-react";
import clsx from "clsx";
import Draggable from "react-draggable";
import { ReactNode, RefObject, useRef, useState } from "react";

type Props = {
    title: string;
    visible: boolean;
    onClose: () => void;
    children: ReactNode;
};

export default function DialogAIFaceRecog({
    title,
    visible,
    onClose,
    children,
}: Props) {
    const [minimized, setMinimized] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    if (!visible) return null;

    return (
        <Draggable handle=".handle" nodeRef={nodeRef as RefObject<HTMLElement>}>
            <div
             ref={nodeRef} 
                className={clsx(
                    "fixed z-[9999] bg-white rounded-lg shadow-lg border text-black",
                    minimized ? "w-64 h-auto" : "w-[440px] min-h-[300px]"
                )}
                style={{ top: 100, left: 100 }}
            >
                <div className="handle cursor-move bg-gray-100 p-2 flex justify-between items-center rounded-t-lg">
                    <span className="font-semibold text-sm">{title}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMinimized(!minimized)}>
                            <Minus className="w-4 h-4" />
                        </button>
                        <button onClick={onClose}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {!minimized && <div className="p-4">{children}</div>}
            </div>
        </Draggable>
    );
}
