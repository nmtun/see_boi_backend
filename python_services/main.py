import os
import base64
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import cv2
import numpy as np
from facemesh_handler import FaceMeshHandler
from face_analyzer import FaceAnalyzer

load_dotenv()
AI_SERVER_HOST = os.getenv("AI_SERVER_HOST", "127.0.0.1")
AI_SERVER_PORT = int(os.getenv("AI_SERVER_PORT", 6677))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fmh = FaceMeshHandler(model_path="face_landmarker.task", num_faces=1)

@app.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_cv is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        face_landmarks_list, h, w = fmh.detect(img_cv)
        if not face_landmarks_list:
            raise HTTPException(status_code=400, detail="No face detected")

        landmarks = fmh.extract_landmarks(face_landmarks_list, h, w)

        fa = FaceAnalyzer(landmarks)
        report = fa.infer_all()

        img_out, img_out_bytes = fmh.draw_landmarks_from_bytes(
            image_bytes, landmarks
        )

        img_base64 = base64.b64encode(img_out_bytes).decode("utf-8")

        return {
            "report": report,
            "metrics": {},         
            "landmarks": landmarks,
            "visualized_image_base64": img_base64,
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI processing error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=AI_SERVER_HOST, port=AI_SERVER_PORT)
