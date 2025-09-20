import React, { useState, useRef, useEffect } from 'react';
import Modal from 'react-modal';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

import templateSrc from './assets/id-card-template.png';

Modal.setAppElement('#root');

// FIX 1: Re-added the inline styles for the modal
const customModalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    position: 'relative',
    inset: 'auto',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    maxWidth: '500px',
    maxHeight: '90vh',
    width: '90%',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
};

function getCroppedImg(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0, crop.width, crop.height
  );
  return canvas.toDataURL('image/png');
}

function App() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const canvasRef = useRef(null);

  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const imgRef = useRef(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOBUg93qHRm1ZJDzIxxU4uH4xSOTtg4WzBPxu9XwbZhyd3r4z2Rh6t95hon3drsCl_3Q/exec';

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const template = new Image();
    template.src = templateSrc;
    template.onload = () => ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
  }, []);

  function onSelectFile(e) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setModalIsOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height);
    setCrop(crop);
  }

  function handleApplyCrop() {
    if (!completedCrop || !imgRef.current) return;
    const finalCroppedImage = getCroppedImg(imgRef.current, completedCrop);
    setCroppedImageUrl(finalCroppedImage);
    setModalIsOpen(false);
  }
  
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const saveDataToSheet = async (idNumber, issuedDate, expiresOn) => {
    setIsSaving(true);
    setSaveStatus('');
    setSaveMessage('');
    const dataToSave = { name, dob, aadhar, idNumber, city, state, pincode, whatsapp, issuedDate, expiresOn };

    const formData = new FormData();
    formData.append('data', JSON.stringify(dataToSave));

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
      const result = await response.json();
      if (result.status === 'success') {
        setSaveStatus('success');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'Failed to send data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = () => {
    if (!name || !dob || !aadhar || !whatsapp || !city || !state || !pincode || !croppedImageUrl) {
      alert("Please fill in ALL fields, including address, WhatsApp, and photo.");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const template = new Image();
    template.src = templateSrc;

    template.onload = () => {
      ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
      
      const userPhoto = new Image();
      // FIX 2: Re-added this line to prevent the square photo bug
      userPhoto.crossOrigin = 'Anonymous';
      userPhoto.src = croppedImageUrl;

      userPhoto.onload = () => {
        const issuedDate = new Date();
        const expiresOn = new Date(issuedDate);
        expiresOn.setMonth(issuedDate.getMonth() + 6);
        
        const formattedIssuedDate = formatDate(issuedDate);
        const formattedExpiresOn = formatDate(expiresOn);

        // --- CIRCULAR PHOTO DRAWING LOGIC ---
        const photoSize = 144;
        const photoX = canvas.width / 2 - photoSize / 2;
        const photoY = 107;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(userPhoto, photoX, photoY, photoSize, photoSize);
        ctx.restore();

        const mainFont = "bold 30px 'Segoe UI', Arial";
        const subFont = "16px 'Segoe UI', Arial";
        const detailFont = "bold 22px 'Segoe UI', Arial";
        const detailDataFont = "22px 'Segoe UI', Arial";
        const dateFont = "bold 11px 'Segoe UI', Arial";
        
        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = mainFont;
        ctx.fillText(name.toUpperCase(), canvas.width / 2, 400);
        ctx.font = subFont;
        ctx.fillText('DISTRICT FIELD REPORTER', canvas.width / 2, 425);
        
        const dayOfBirth = dob.split('-')[2];
        const lastTwoAadhar = aadhar.slice(-2);
        const idNumber = `KN-${dayOfBirth}${lastTwoAadhar}`;

        ctx.textAlign = 'left';
        ctx.font = detailFont;
        ctx.fillText('ID NO', 80, 480);
        ctx.fillText('DOB', 80, 515);
        ctx.fillText(':', 160, 480);
        ctx.fillText(':', 160, 515);
        
        ctx.font = detailDataFont;
        ctx.fillText(idNumber.toUpperCase(), 180, 480); 
        ctx.fillText(dob.split('-').reverse().join('-'), 180, 515);
        
        ctx.textAlign = 'center';
        ctx.font = dateFont;
        ctx.fillText(`Issued: ${formattedIssuedDate} | Expires: ${formattedExpiresOn}`, canvas.width / 2, 550);
        
        const url = canvas.toDataURL('image/png');
        setDownloadUrl(url);
        saveDataToSheet(idNumber, formattedIssuedDate, formattedExpiresOn);
      };
    };
  };

  return (
    <div className="App">
      <h1>ID Card Generator</h1>
      <div className="card-container">
        <canvas ref={canvasRef} width="400" height="600" />
      </div>

      <div className="input-form">
        <label>Full Name:</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        
        <label>Aadhar Number:</label>
        <input type="number" value={aadhar} onChange={(e) => setAadhar(e.target.value)} />

        <label>Date of Birth:</label>
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        
        <label>WhatsApp Number:</label>
        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />

        <label>City:</label>
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />

        <label>State:</label>
        <input type="text" value={state} onChange={(e) => setState(e.target.value)} />

        <label>Pincode:</label>
        <input type="number" value={pincode} onChange={(e) => setPincode(e.target.value)} />

        <div className="photo-upload-section">
          {croppedImageUrl && <img src={croppedImageUrl} alt="Cropped Preview" className="photo-preview" />}
          <label className="photo-upload-label">
            {croppedImageUrl ? 'Change Photo' : 'Upload Photo'}
            <input type="file" accept="image/*" onChange={onSelectFile} />
          </label>
        </div>
        
        <button onClick={handleGenerate} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Generate ID Card'}
        </button>
        
        {saveStatus === 'success' && <p className="success-message">Data saved successfully!</p>}
        {saveStatus === 'error' && <p className="error-message">Error: {saveMessage}</p>}

        {downloadUrl && !isSaving && (
          <a href={downloadUrl} download={`ID-Card-${name}.png`} className="download-btn">
            Download ID Card
          </a>
        )}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        style={customModalStyles} // Use the inline styles
      >
        <h2>Crop Your Photo</h2>
        {imgSrc && (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
          >
            <img ref={imgRef} alt="Crop me" src={imgSrc} onLoad={onImageLoad} />
          </ReactCrop>
        )}
        <button onClick={handleApplyCrop} className="crop-button">
          Apply Crop
        </button>
      </Modal>
    </div>
  );
}

export default App;