import { useRef, useEffect, useState } from 'react';

const CollaborativeWhiteboard = ({ stompClient, roomId, currentUserEmail }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Tool States
    const [color, setColor] = useState('#39FF14'); // Default Green
    const [brushSize, setBrushSize] = useState(3);
    const [isEraser, setIsEraser] = useState(false);

    const currentPos = useRef({ x: 0, y: 0 });

    // 1. Initialize the Native Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height || 500;

        context.lineCap = "round";
        const savedImage = sessionStorage.getItem(`whiteboard_${roomId}`);
                if (savedImage) {
                    const img = new Image();
                    img.src = savedImage;
                    // Draws the saved image back onto the canvas once it loads
                    img.onload = () => context.drawImage(img, 0, 0);
                }
        contextRef.current = context;

        const handleResize = () => {
            const newRect = canvas.parentElement.getBoundingClientRect();
            canvas.width = newRect.width;
            canvas.height = newRect.height || 500;
            context.lineCap = "round";
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 2. Listen for Incoming WebSocket Drawings
    useEffect(() => {
        if (!roomId) {
            console.warn("Whiteboard: No activeRoomId provided. Cannot subscribe.");
            return;
        }
        if (!stompClient || !stompClient.connected) {
            console.warn("Whiteboard: STOMP client not connected yet.");
            return;
        }

        console.log(`Subscribing to whiteboard for room: ${roomId}`);
        const subscription = stompClient.subscribe(`/topic/session/${roomId}/whiteboard`, (message) => {
            const data = JSON.parse(message.body);
            console.log("Whiteboard stroke received:", data);

            // Draw the incoming line using the SENDER'S color and size
            if (data.sender !== currentUserEmail) {
                drawSegment(data.x0, data.y0, data.x1, data.y1, data.color, data.width, false);
            }
        });

        return () => subscription.unsubscribe();
    }, [stompClient, roomId, currentUserEmail]);

    // 3. The Core Drawing Function
    const drawSegment = (x0, y0, x1, y1, strokeColor, strokeWidth, emitToNetwork) => {
        const context = contextRef.current;
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = strokeColor;
        context.lineWidth = strokeWidth;
        context.stroke();
        context.closePath();

        // Broadcast our line segment to the network
        if (emitToNetwork) {
            if (stompClient && stompClient.connected && roomId) {
                stompClient.publish({
                    destination: `/app/whiteboard.sendPrivate/${roomId}`,
                    body: JSON.stringify({
                        sender: currentUserEmail,
                        x0: x0, y0: y0, x1: x1, y1: y1,
                        color: strokeColor,
                        width: strokeWidth
                    })
                });
            } else {
                console.warn("Whiteboard: Cannot publish stroke - STOMP connected:", !!(stompClient && stompClient.connected), "RoomId:", roomId);
            }
        }
    };

    // 4. Mouse Event Handlers
    const onMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        currentPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setIsDrawing(true);
    };

    const onMouseUp = () => {setIsDrawing(false);
        if (roomId) {
                    sessionStorage.setItem(`whiteboard_${roomId}`, canvasRef.current.toDataURL());
                }
            };

    const onMouseMove = (e) => {
        if (!isDrawing) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;

        // If eraser is active, paint with the background color
        const activeColor = isEraser ? '#050100' : color;

        drawSegment(currentPos.current.x, currentPos.current.y, newX, newY, activeColor, brushSize, true);

        currentPos.current = { x: newX, y: newY };
    };

    const colors = ['#39FF14', '#E0B0FF', '#40E0D0', '#FFD700', '#FF073A', '#FFFFFF'];
const handleDownload = () => {
        const canvas = canvasRef.current;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ctx = exportCanvas.getContext('2d');


        ctx.fillStyle = '#050100';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);


        ctx.drawImage(canvas, 0, 0);


        const link = document.createElement('a');
        link.download = `architecture-session-${roomId}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    };
    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#050100', display: 'flex', flexDirection: 'column' }}>

            {/* TOOLBAR */}
            <div style={{ display: 'flex', gap: '15px', padding: '10px', backgroundColor: '#111', borderBottom: '1px solid #333', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid #333', paddingRight: '15px' }}>
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => { setColor(c); setIsEraser(false); }}
                            style={{
                                width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c,
                                border: color === c && !isEraser ? '2px solid white' : '2px solid transparent',
                                cursor: 'pointer'
                            }}
                            title={c}
                        />
                    ))}
                </div>

                <button
                    onClick={() => setIsEraser(!isEraser)}
                    style={{ padding: '5px 10px', backgroundColor: isEraser ? 'white' : '#222', color: isEraser ? 'black' : 'white', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isEraser ? '🧹 Eraser Active' : 'Eraser'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'gray', fontSize: '12px', borderRight: '1px solid #333', paddingRight: '15px' }}>
                    Size:
                    <input
                        type="range" min="1" max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        style={{ cursor: 'pointer' }}
                    />
                </div>

                <button
                    onClick={() => {
                        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }}
                    style={{ marginLeft: 'auto', padding: '5px 10px', backgroundColor: '#333', color: '#FF073A', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    🗑️ Clear Board
                </button>
                <button
                                    onClick={handleDownload}
                                    style={{ padding: '5px 10px', backgroundColor: '#40E0D0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    📸 Save Image
                                </button>
            </div>

            {/* CANVAS AREA */}
            <div style={{ flex: 1, position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={onMouseDown}
                    onMouseUp={onMouseUp}
                    onMouseOut={onMouseUp}
                    onMouseMove={onMouseMove}
                    style={{ cursor: isEraser ? 'cell' : 'crosshair', display: 'block', width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
};

export default CollaborativeWhiteboard;