import React, { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import GifReader from 'omggif';
import GIF from 'gif.js';

function App() {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [gifFrames, setGifFrames] = useState([]);
  const [cropRect, setCropRect] = useState(null);

  useEffect(() => {
    const fabricCanvas = new fabric.Canvas(canvasRef.current);
    setCanvas(fabricCanvas);
    return () => fabricCanvas.dispose();
  }, []);

  const loadGif = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      try {
        const gif = new GifReader(new Uint8Array(arrayBuffer));
        const frames = [];
        for (let i = 0; i < gif.numFrames(); i++) {
          const frameInfo = gif.frameInfo(i);
          const rgba = new Uint8Array(frameInfo.width * frameInfo.height * 4);
          gif.decodeAndBlitFrameRGBA(i, rgba);

          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = frameInfo.width;
          frameCanvas.height = frameInfo.height;
          const ctx = frameCanvas.getContext('2d');
          const imageData = ctx.createImageData(frameInfo.width, frameInfo.height);
          imageData.data.set(rgba);
          ctx.putImageData(imageData, 0, 0);

          frames.push({
            canvas: frameCanvas,
            delay: frameInfo.delay * 10 || 100
          });
        }
        setGifFrames(frames);
        canvas.setWidth(frames[0].canvas.width);
        canvas.setHeight(frames[0].canvas.height);

        const img = new Image();
        img.onload = () => {
          const fabricImg = new fabric.Image(img);
          canvas.add(fabricImg);
          canvas.renderAll();
        };
        img.src = frames[0].canvas.toDataURL();
      } catch (error) {
        alert('Ошибка загрузки GIF: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'image/gif') {
      loadGif(file);
    } else {
      alert('Выберите GIF файл.');
    }
  };

  const addText = () => {
    const text = new fabric.IText('Текст', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: '#fff'
    });
    canvas.add(text);
  };

  const crop = () => {
    if (cropRect) {
      // Apply crop
      const left = cropRect.left;
      const top = cropRect.top;
      const width = cropRect.width * cropRect.scaleX;
      const height = cropRect.height * cropRect.scaleY;

      const newFrames = gifFrames.map(frame => {
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        const ctx = croppedCanvas.getContext('2d');
        ctx.drawImage(frame.canvas, -left, -top);
        return { ...frame, canvas: croppedCanvas };
      });
      setGifFrames(newFrames);
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.remove(cropRect);
      setCropRect(null);
      canvas.renderAll();
    } else {
      // Add crop rect
      const rect = new fabric.Rect({
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
      canvas.add(rect);
      canvas.setActiveObject(rect);
      setCropRect(rect);
    }
  };

  const applyEffect = () => {
    const newFrames = gifFrames.map(frame => {
      const ctx = frame.canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, frame.canvas.width, frame.canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      return frame;
    });
    setGifFrames(newFrames);
    canvas.renderAll();
  };

  const exportGif = () => {
    if (gifFrames.length === 0) {
      alert('Сначала загрузите GIF.');
      return;
    }
    const gif = new GIF({ workers: 2, quality: 10, workersPath: './' });
    gifFrames.forEach(frame => {
      const editedCanvas = document.createElement('canvas');
      editedCanvas.width = frame.canvas.width;
      editedCanvas.height = frame.canvas.height;
      const ctx = editedCanvas.getContext('2d');
      ctx.drawImage(frame.canvas, 0, 0);

      const objects = canvas.getObjects();
      objects.forEach(obj => {
        if (obj.type === 'i-text' || obj.type === 'text') {
          ctx.font = `${obj.fontSize}px Arial`;
          ctx.fillStyle = obj.fill;
          ctx.fillText(obj.text, obj.left, obj.top + obj.fontSize);
        }
      });
      gif.addFrame(editedCanvas, { delay: frame.delay });
    });
    gif.on('finished', (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited.gif';
      link.click();
      URL.revokeObjectURL(url);
    });
    gif.render();
  };

  return (
    <div className="container">
      <h1>MEMFY for GIF</h1>
      <div className="upload-area">
        <p>Перетащите GIF сюда или <button onClick={() => document.getElementById('fileInput').click()}>Выберите файл</button></p>
        <input type="file" id="fileInput" accept="image/gif" style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>
      <div className="editor">
        <div className="tools">
          <button onClick={addText}>📝 Добавить текст</button>
          <button onClick={crop}>✂️ Обрезать</button>
          <button onClick={applyEffect}>🎨 Эффекты</button>
          <button onClick={exportGif}>💾 Экспорт GIF</button>
        </div>
        <canvas ref={canvasRef} width={500} height={300} />
      </div>
    </div>
  );
}

export default App;
