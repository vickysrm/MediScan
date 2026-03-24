import os
import json
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from pathlib import Path

class PrescriptionDataGenerator:
    def __init__(self, output_dir="training/data", num_samples=1000):
        self.output_dir = Path(output_dir)
        self.images_dir = self.output_dir / "images"
        self.annotations_dir = self.output_dir / "annotations"
        self.num_samples = num_samples
        
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.annotations_dir.mkdir(parents=True, exist_ok=True)
        
        self.drugs = [
            ("Metformin", "500mg", "Twice daily after meals"),
            ("Metformin", "1000mg", "Once daily with dinner"),
            ("Amlodipine", "5mg", "Once daily in morning"),
            ("Amlodipine", "10mg", "Once daily"),
            ("Omeprazole", "20mg", "Before breakfast"),
            ("Omeprazole", "40mg", "Once daily empty stomach"),
            ("Atorvastatin", "10mg", "Once daily at bedtime"),
            ("Atorvastatin", "20mg", "Once daily"),
            ("Losartan", "50mg", "Once daily"),
            ("Losartan", "100mg", "Once daily"),
            ("Paracetamol", "500mg", "Three times daily"),
            ("Paracetamol", "650mg", "As needed for pain"),
            ("Ibuprofen", "400mg", "Three times daily after food"),
            ("Ibuprofen", "200mg", "As needed"),
            ("Diclofenac", "50mg", "Twice daily"),
            ("Cetirizine", "10mg", "Once daily at night"),
            ("Pantoprazole", "40mg", "Before breakfast"),
            ("Ranitidine", "150mg", "Twice daily"),
            ("Salbutamol", "100mcg", "As needed for breathlessness"),
            ("Montelukast", "10mg", "Once daily at bedtime"),
        ]
        
        self.doctors = [
            "Dr. Rajesh Kumar",
            "Dr. Priya Sharma", 
            "Dr. Amit Patel",
            "Dr. Sneha Gupta",
            "Dr. Vikram Singh",
            "Dr. Anjali Verma",
            "Dr. Suresh Rao",
            "Dr. Meera Joshi"
        ]
        
        self.hospital_names = [
            "City Hospital",
            "MultiCare Clinic",
            "HealthFirst Medical",
            "Apollo Clinic",
            "MediCare Center",
            ""
        ]
        
    def add_noise(self, img, intensity=0.05):
        img_array = np.array(img).astype(np.float32)
        noise = np.random.randn(*img_array.shape) * intensity * 255
        noisy = img_array + noise
        return Image.fromarray(np.clip(noisy, 0, 255).astype(np.uint8))
    
    def add_blur(self, img, radius=0.5):
        return img.filter(ImageFilter.GaussianBlur(radius=radius))
    
    def add_rotation(self, img, angle_range=(-3, 3)):
        angle = random.uniform(*angle_range)
        return img.rotate(angle, fillcolor=(255, 255, 255))
    
    def add_skew(self, img, skew_range=(-0.02, 0.02)):
        img_array = np.array(img)
        h, w = img_array.shape[:2]
        
        skew_x = random.uniform(*skew_range)
        
        pts1 = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
        pts2 = np.float32([
            [skew_x * h, 0],
            [w + skew_x * h, 0],
            [0, h],
            [w, h]
        ])
        
        matrix = self._get_perspective_matrix(pts1, pts2, w, h)
        from scipy import ndimage
        skewed = ndimage.affine_transform(img_array, matrix[:2, :2], offset=matrix[:2, 2])
        
        return Image.fromarray(np.clip(skewed, 0, 255).astype(np.uint8))
    
    def _get_perspective_matrix(self, pts1, pts2, w, h):
        A = []
        for i in range(4):
            x, y = pts1[i]
            u, v = pts2[i]
            A.append([-x, -y, -1, 0, 0, 0, u*x, u*y, u])
            A.append([0, 0, 0, -x, -y, -1, v*x, v*y, v])
        
        A = np.array(A)
        B = pts2.flatten()
        try:
            H = np.linalg.lstsq(A, B, rcond=None)[0]
        except:
            H = np.eye(3).flatten()
        
        H[8] = 1
        return H.reshape(3, 3)
    
    def get_font(self, size=20):
        font_paths = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/times.ttf",
            "C:/Windows/Fonts/calibri.ttf",
            "C:/Windows/Fonts/consola.ttf",
        ]
        
        available_fonts = [p for p in font_paths if os.path.exists(p)]
        
        if available_fonts:
            try:
                return ImageFont.truetype(random.choice(available_fonts), size)
            except:
                pass
        
        return ImageFont.load_default()
    
    def generate_prescription(self, idx):
        width, height = 800, random.randint(600, 900)
        bg_color = random.randint(250, 255)
        img = Image.new('RGB', (width, height), color=(bg_color, bg_color, bg_color))
        draw = ImageDraw.Draw(img)
        
        y_pos = 40
        
        hospital = random.choice(self.hospital_names)
        if hospital:
            font_h = self.get_font(16)
            draw.text((width//2 - 100, y_pos), hospital, fill=(0, 0, 0), font=font_h)
            y_pos += 30
        
        font_title = self.get_font(18)
        draw.text((width//2 - 80, y_pos), "PRESCRIPTION", fill=(0, 0, 0), font=font_title)
        y_pos += 40
        
        draw.line([(50, y_pos), (width-50, y_pos)], fill=(150, 150, 150), width=1)
        y_pos += 20
        
        date_text = f"Date: {random.randint(1,28):02d}/{random.randint(1,12):02d}/2024"
        font_normal = self.get_font(14)
        draw.text((50, y_pos), date_text, fill=(50, 50, 50), font=font_normal)
        
        doctor = random.choice(self.doctors)
        draw.text((400, y_pos), doctor, fill=(0, 0, 0), font=font_normal)
        y_pos += 50
        
        draw.line([(50, y_pos), (width-50, y_pos)], fill=(200, 200, 200), width=1)
        y_pos += 30
        
        font_med = self.get_font(18)
        draw.text((50, y_pos), "Rx:", fill=(0, 0, 0), font=font_med)
        y_pos += 35
        
        medications = []
        num_meds = random.randint(1, 4)
        selected_drugs = random.sample(self.drugs, min(num_meds, len(self.drugs)))
        
        for i, (drug, dosage, freq) in enumerate(selected_drugs):
            variation = random.choice([1, 2, 3])
            if variation == 1:
                dosage = dosage.replace("mg", " mg").replace("mcg", " mcg")
            
            rx_line = f"  {drug}  {dosage}  -  {freq}"
            draw.text((70, y_pos), rx_line, fill=(0, 0, 0), font=font_normal)
            
            medications.append({
                "drug": drug,
                "dosage": dosage,
                "frequency": freq,
                "text": rx_line,
                "bbox": [70, y_pos, 70 + len(rx_line) * 8, y_pos + 20]
            })
            
            y_pos += 30
            if random.random() > 0.7:
                duration = random.choice(["for 5 days", "for 7 days", "for 14 days", "for 1 month", ""])
                if duration:
                    draw.text((90, y_pos), duration, fill=(80, 80, 80), font=self.get_font(14))
                    y_pos += 25
            
            y_pos += 15
        
        y_pos += 30
        draw.line([(50, y_pos), (width-50, y_pos)], fill=(200, 200, 200), width=1)
        y_pos += 25
        
        if random.random() > 0.3:
            warnings = [
                "Avoid alcohol",
                "Take after food",
                "Do not crush",
                "Store in cool place",
                "Complete full course",
                "Take at same time daily"
            ]
            draw.text((50, y_pos), "Instructions:", fill=(100, 0, 0), font=self.get_font(14))
            y_pos += 25
            for w in random.sample(warnings, min(2, len(warnings))):
                draw.text((70, y_pos), f"- {w}", fill=(100, 0, 0), font=self.get_font(13))
                y_pos += 22
        
        y_pos = height - 80
        draw.line([(50, y_pos), (width-50, y_pos)], fill=(150, 150, 150), width=1)
        y_pos += 15
        draw.text((50, y_pos), "Signature: ________________", fill=(0, 0, 0), font=self.get_font(12))
        
        aug = random.choice(['none', 'noise', 'blur', 'rotation'])
        if aug == 'noise':
            img = self.add_noise(img, intensity=0.03)
        elif aug == 'blur':
            img = self.add_blur(img, radius=0.3)
        elif aug == 'rotation':
            img = self.add_rotation(img, (-2, 2))
        
        img = img.convert('L')
        img = Image.eval(img, lambda x: 255 - x)
        
        filename = f"prescription_{idx:05d}.png"
        img.save(self.images_dir / filename)
        
        annotation = {
            "image": filename,
            "width": width,
            "height": height,
            "medications": medications,
            "doctor": doctor,
            "date": date_text,
            "raw_text": "\n".join([m["text"] for m in medications])
        }
        
        with open(self.annotations_dir / f"{filename.replace('.png', '.json')}", 'w') as f:
            json.dump(annotation, f, indent=2)
        
        return annotation
    
    def generate_dataset(self):
        print(f"Generating {self.num_samples} prescription images...")
        
        for i in range(self.num_samples):
            if (i + 1) % 100 == 0:
                print(f"  Generated {i + 1}/{self.num_samples}")
            self.generate_prescription(i)
        
        manifest = {
            "num_samples": self.num_samples,
            "classes": list(set([d[0] for d in self.drugs]))
        }
        
        with open(self.output_dir / "manifest.json", 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"Dataset generated in {self.output_dir}")
        print(f"  Images: {self.images_dir}")
        print(f"  Annotations: {self.annotations_dir}")

if __name__ == "__main__":
    generator = PrescriptionDataGenerator(
        output_dir="training/data",
        num_samples=500
    )
    generator.generate_dataset()
