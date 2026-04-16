import React from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { ZoomIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db, doc, setDoc } from '@/lib/firebase';

interface ImageEditorProps {
  image: string;
  onClose: () => void;
  onSuccess: (url: string) => void;
  userEmail?: string;
  targetDocPath: string; // e.g., 'config/app' or 'users/UID'
  targetField: string;   // e.g., 'logoUrl' or 'photoURL'
  buttonText?: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ 
  image, 
  onClose, 
  onSuccess, 
  userEmail,
  targetDocPath,
  targetField,
  buttonText = "Confirmar"
}) => {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<any>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const onCropComplete = React.useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (error) => reject(error));
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const img = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Limit resolution to 400x400 to stay under Firestore 1MB limit
    const MAX_SIZE = 400;
    let width = pixelCrop.width;
    let height = pixelCrop.height;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = width * ratio;
      height = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(
      img,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height
    );

    // Use jpeg with 0.8 quality to further reduce size
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      
      const pathParts = targetDocPath.split('/');
      if (pathParts.length < 2) throw new Error("Caminho do documento inválido");
      
      const docRef = doc(db, pathParts[0], pathParts[1]);
      await setDoc(docRef, { 
        [targetField]: croppedImage,
        updatedBy: userEmail,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      toast.success("Imagem atualizada com sucesso!");
      onSuccess(croppedImage);
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar imagem:", error);
      toast.error(`Erro ao salvar: ${error.message || "Tente uma imagem menor"}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Stable value for slider to prevent jumping
  const sliderValue = React.useMemo(() => [zoom], [zoom]);

  return (
    <div className="space-y-6">
      <div className="relative h-64 w-full bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={(z) => setZoom(z || 1)}
          onCropComplete={onCropComplete}
        />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-2">
          <ZoomIn className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.01}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
          <span className="text-[10px] font-mono text-neutral-500 w-8 text-right">
            {(zoom || 1).toFixed(2)}x
          </span>
        </div>
        <p className="text-[10px] text-center text-neutral-500 uppercase tracking-widest">
          Arraste a imagem para ajustar a posição ou use o scroll
        </p>
      </div>

      <div className="flex gap-3">
        <Button 
          variant="ghost" 
          className="flex-1 border border-neutral-800" 
          onClick={onClose}
          disabled={isUploading}
        >
          Cancelar
        </Button>
        <Button 
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold" 
          onClick={handleSave}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </div>
          ) : (
            buttonText
          )}
        </Button>
      </div>
    </div>
  );
};
