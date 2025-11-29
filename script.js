// Initialize Fabric canvas
const canvas = new fabric.Canvas('canvas');
let currentGif = null;
let gifFrames = []; // Array of {canvas, delay}
let cropRect = null; // For cropping

// Upload handlers
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#4CAF50';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ddd';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ddd';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (file.type === 'image/gif') {
        loadGif(file);
    } else {
        alert('Пожалуйста, выберите GIF файл.');
    }
}

function loadGif(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        try {
            const gif = new GifReader(new Uint8Array(arrayBuffer));
            gifFrames = [];
            for (let i = 0; i < gif.numFrames(); i++) {
                const frameInfo = gif.frameInfo(i);
                const rgba = new Uint8Array(frameInfo.width * frameInfo.height * 4);
                gif.decodeAndBlitFrameRGBA(i, rgba);

                // Create canvas for frame
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = frameInfo.width;
                frameCanvas.height = frameInfo.height;
                const ctx = frameCanvas.getContext('2d');
                const imageData = ctx.createImageData(frameInfo.width, frameInfo.height);
                imageData.data.set(rgba);
                ctx.putImageData(imageData, 0, 0);

                gifFrames.push({
                    canvas: frameCanvas,
                    delay: frameInfo.delay * 10 || 100 // delay in ms
                });
            }

            // Set canvas size to first frame size
            canvas.setWidth(gifFrames[0].canvas.width);
            canvas.setHeight(gifFrames[0].canvas.height);

            // Display first frame on Fabric canvas
            const img = new Image();
            img.onload = function() {
                const fabricImg = new fabric.Image(img);
                canvas.add(fabricImg);
                canvas.renderAll();
            };
            img.src = gifFrames[0].canvas.toDataURL();
            currentGif = arrayBuffer;
        } catch (error) {
            alert('Ошибка загрузки GIF: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Tool handlers
document.getElementById('addTextBtn').addEventListener('click', () => {
    const text = new fabric.IText('Текст', {
        left: 100,
        top: 100,
        fontSize: 20,
        fill: '#fff' // White for dark theme
    });
    canvas.add(text);
});

document.getElementById('cropBtn').addEventListener('click', () => {
    if (cropRect) {
        // Apply crop
        const left = cropRect.left;
        const top = cropRect.top;
        const width = cropRect.width * cropRect.scaleX;
        const height = cropRect.height * cropRect.scaleY;

        // Crop all frames
        gifFrames.forEach(frame => {
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = width;
            croppedCanvas.height = height;
            const ctx = croppedCanvas.getContext('2d');
            ctx.drawImage(frame.canvas, -left, -top);
            frame.canvas = croppedCanvas;
        });

        // Update main canvas
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.remove(cropRect);
        cropRect = null;
        canvas.renderAll();
    } else {
        // Add crop rectangle
        cropRect = new fabric.Rect({
            left: 50,
            top: 50,
            width: 200,
            height: 150,
            fill: 'rgba(255,0,0,0.3)',
            stroke: 'red',
            strokeWidth: 2,
            selectable: true,
            hasControls: true
        });
        canvas.add(cropRect);
        canvas.setActiveObject(cropRect);
    }
});

document.getElementById('effectBtn').addEventListener('click', () => {
    // Apply grayscale to all frames
    gifFrames.forEach(frame => {
        const ctx = frame.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, frame.canvas.width, frame.canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
    });
    // Update main canvas
    canvas.renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if (gifFrames.length === 0) {
        alert('Сначала загрузите GIF.');
        return;
    }
    const gif = new GIF({
        workers: 2,
        quality: 10,
        workersPath: './'
    });

    gifFrames.forEach(frame => {
        // Create a new canvas for edited frame
        const editedCanvas = document.createElement('canvas');
        editedCanvas.width = frame.canvas.width;
        editedCanvas.height = frame.canvas.height;
        const ctx = editedCanvas.getContext('2d');

        // Draw edited frame (with effects/crop)
        ctx.drawImage(frame.canvas, 0, 0);

        // Apply current canvas objects (text, etc.) from Fabric
        const objects = canvas.getObjects();
        objects.forEach(obj => {
            if (obj.type === 'i-text' || obj.type === 'text') {
                ctx.font = `${obj.fontSize}px ${obj.fontFamily || 'Arial'}`;
                ctx.fillStyle = obj.fill;
                ctx.fillText(obj.text, obj.left, obj.top + obj.fontSize);
            }
            // Add more object types if needed
        });

        gif.addFrame(editedCanvas, {delay: frame.delay});
    });

    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'edited.gif';
        link.click();
        URL.revokeObjectURL(url);
    });
    gif.on('error', function(error) {
        alert('Ошибка экспорта: ' + error);
    });
    try {
        gif.render();
    } catch (e) {
        alert('Ошибка рендеринга: ' + e.message);
    }
});