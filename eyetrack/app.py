import streamlit as st
import fitz  # PyMuPDF
import numpy as np
import cv2
from l2cs import Pipeline, render as render_gaze  # <-- L2CS import
import torch
import tempfile

st.set_page_config(page_title="PDF Eye Tracking Heatmap", layout="wide")
st.title("PDF Eye Tracking Heatmap Demo")

# 1. PDF Upload
pdf_file = st.file_uploader("Upload a PDF", type="pdf")

if pdf_file:
    # Save PDF to a temp file for PyMuPDF
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
        tmp_pdf.write(pdf_file.read())
        tmp_pdf_path = tmp_pdf.name

    doc = fitz.open(tmp_pdf_path)
    page = doc[0]  # First page only for now
    pix = page.get_pixmap()
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
    st.image(img, channels="RGB", caption="First page of PDF")

    # 2. Eye Tracking Setup (L2CS)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    gaze_weights = "eyegotchu/ai/models/Gaze360/L2CSNet_gaze360.pkl"  # adjust path if needed
    gaze_pipeline = Pipeline(
        weights=gaze_weights,
        arch="ResNet50",
        device=device
    )
    cap = cv2.VideoCapture(0)
    screen_width, screen_height = img.shape[1], img.shape[0]
    heatmap = np.zeros((screen_height, screen_width), dtype=np.float32)

    # 3. Start Eye Tracking
    if 'tracking' not in st.session_state:
        st.session_state['tracking'] = False
    if 'heatmap' not in st.session_state:
        st.session_state['heatmap'] = heatmap

    col1, col2 = st.columns(2)
    with col1:
        if st.button("Start Eye Tracking"):
            st.session_state['tracking'] = True
            st.session_state['heatmap'] = np.zeros((screen_height, screen_width), dtype=np.float32)

    with col2:
        if st.button("Show Hot Content"):
            st.session_state['tracking'] = False
            # Find the hottest spot
            heatmap = st.session_state['heatmap']
            if np.max(heatmap) > 0:
                hot_y, hot_x = np.unravel_index(np.argmax(heatmap), heatmap.shape)
                # Extract text near (hot_x, hot_y)
                words = page.get_text("words")  # list of (x0, y0, x1, y1, word, block_no, line_no, word_no)
                # Find closest word center
                min_dist = float('inf')
                closest_word = None
                for w in words:
                    wx = (w[0] + w[2]) / 2
                    wy = (w[1] + w[3]) / 2
                    dist = (wx - hot_x) ** 2 + (wy - hot_y) ** 2
                    if dist < min_dist:
                        min_dist = dist
                        closest_word = w
                if closest_word:
                    st.markdown(f"**Hot content:** {closest_word[4]}")
                else:
                    st.info("No text found near the hot area.")
            else:
                st.info("No gaze data collected yet.")

    # 4. Main Loop (runs only if tracking)
    if st.session_state['tracking']:
        st.warning("Eye tracking is running. Close this warning to stop.")
        frame_placeholder = st.empty()
        while st.session_state['tracking']:
            ret, frame = cap.read()
            if not ret:
                st.error("Webcam not found.")
                break
            # --- L2CS Gaze Estimation ---
            try:
                gaze_res = gaze_pipeline.step(frame)
                if gaze_res.pitch.size:
                    pitch = float(gaze_res.pitch[0])
                    yaw = float(gaze_res.yaw[0])
                    # Map yaw/pitch to PDF image coordinates
                    x = int(((yaw/np.pi)+1)/2 * screen_width)
                    y = int(((pitch/np.pi)+1)/2 * screen_height)
                    if 0 <= x < screen_width and 0 <= y < screen_height:
                        st.session_state['heatmap'][y, x] += 1
            except Exception as e:
                st.error(f"Gaze estimation error: {e}")
            # Overlay heatmap
            heatmap_norm = st.session_state['heatmap']
            if np.max(heatmap_norm) > 0:
                heatmap_img = np.uint8(255 * heatmap_norm / np.max(heatmap_norm))
                overlay = cv2.applyColorMap(heatmap_img, cv2.COLORMAP_JET)
                combined = cv2.addWeighted(img, 0.7, overlay, 0.3, 0)
            else:
                combined = img.copy()
            frame_placeholder.image(combined, channels="RGB", caption="Live Heatmap Overlay")
            # Streamlit needs a way to break the loop
            if st.button("Stop Eye Tracking"):
                st.session_state['tracking'] = False
                break 