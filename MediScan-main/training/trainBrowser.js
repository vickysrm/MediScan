import * as tf from '@tensorflow/tfjs';

const IMAGE_HEIGHT = 64;
const IMAGE_WIDTH = 256;
const NUM_DRUG_CLASSES = 50;
const NUM_DOSAGE_CLASSES = 20;

const COMMON_DRUGS = [
  'Metformin', 'Amlodipine', 'Omeprazole', 'Atorvastatin', 'Losartan',
  'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Cetirizine', 'Pantoprazole',
  'Ranitidine', 'Salbutamol', 'Montelukast', 'Metoprolol', 'Ramipril',
  'Telmisartan', 'Rosuvastatin', 'Gliclazide', 'Glimepiride', 'Enalapril',
  'Aspirin', 'Clopidogrel', 'Warfarin', 'Levothyroxine', 'Doxycycline',
  'Azithromycin', 'Ciprofloxacin', 'Amoxicillin', 'Cefixime', 'Metronidazole',
  'Prednisolone', 'Dexmethasone', 'Hydrocortisone', 'Frusemide', 'Spironolactone',
  'Digoxin', 'Carvedilol', 'Bisoprolol', 'Atenolol', 'Propranolol',
  'Lisinopril', 'Enalapril', 'Ramipril', 'Perindopril', 'Olmesartan',
  'Candesartan', 'Irbesartan', 'Nebivolol', 'Labetalol', 'Atenolol'
];

const COMMON_DOSAGES = [
  '500mg', '1000mg', '250mg', '5mg', '10mg', '20mg', '40mg', '50mg', '100mg',
  '200mg', '400mg', '650mg', '75mg', '150mg', '25mg', '12.5mg', '0.5mg',
  '1mg', '2mg', '100mcg'
];

export async function buildAndTrainModel(onProgress) {
  const model = tf.sequential();
  
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_HEIGHT, IMAGE_WIDTH, 1],
    filters: 32,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  
  model.add(tf.layers.conv2d({
    filters: 64,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  
  model.add(tf.layers.conv2d({
    filters: 128,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  
  model.add(tf.layers.flatten());
  
  model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  const drugOutput = tf.layers.dense({
    units: NUM_DRUG_CLASSES,
    activation: 'softmax',
    name: 'drug'
  }).apply(model.output);
  
  const dosageOutput = tf.layers.dense({
    units: NUM_DOSAGE_CLASSES,
    activation: 'softmax',
    name: 'dosage'
  }).apply(model.output);
  
  const multiOutputModel = tf.model({
    inputs: model.input,
    outputs: [drugOutput, dosageOutput]
  });
  
  multiOutputModel.compile({
    optimizer: tf.train.adam(0.001),
    loss: {
      drug: 'categoricalCrossentropy',
      dosage: 'categoricalCrossentropy'
    },
    lossWeights: {
      drug: 1.0,
      dosage: 0.8
    },
    metrics: ['accuracy']
  });
  
  const batchSize = 32;
  const epochs = 10;
  const batchesPerEpoch = 20;
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    
    for (let batch = 0; batch < batchesPerEpoch; batch++) {
      const { xs, drugYs, dosageYs } = generateBatch(batchSize);
      
      const result = await multiOutputModel.trainOnBatch(xs, {
        drug: drugYs,
        dosage: dosageYs
      });
      
      totalLoss += Array.isArray(result) ? result[0] : result;
      
      tf.dispose([xs, drugYs, dosageYs]);
    }
    
    const avgLoss = totalLoss / batchesPerEpoch;
    onProgress?.({ epoch: epoch + 1, epochs, loss: avgLoss });
    console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${avgLoss.toFixed(4)}`);
  }
  
  return multiOutputModel;
}

function generateBatch(batchSize) {
  const images = [];
  const drugLabels = [];
  const dosageLabels = [];
  
  for (let i = 0; i < batchSize; i++) {
    const img = tf.randomNormal([IMAGE_HEIGHT, IMAGE_WIDTH, 1]);
    images.push(img);
    
    const drugIdx = Math.floor(Math.random() * Math.min(COMMON_DRUGS.length, NUM_DRUG_CLASSES));
    const dosageIdx = Math.floor(Math.random() * Math.min(COMMON_DOSAGES.length, NUM_DOSAGE_CLASSES));
    
    drugLabels.push(tf.oneHot(drugIdx, NUM_DRUG_CLASSES));
    dosageLabels.push(tf.oneHot(dosageIdx, NUM_DOSAGE_CLASSES));
  }
  
  return {
    xs: tf.stack(images),
    drugYs: tf.stack(drugLabels),
    dosageYs: tf.stack(dosageLabels)
  };
}

export async function saveModel(model) {
  const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts) => {
    const modelTopology = JSON.stringify(artifacts.modelTopology);
    const weightData = new Uint8Array(artifacts.weightData);
    
    localStorage.setItem('ocr_model_json', modelTopology);
    localStorage.setItem('ocr_model_weights', arrayBufferToBase64(weightData.buffer));
    
    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: 'JSON'
      }
    };
  }));
  
  return saveResult;
}

export async function loadBrowserModel() {
  const modelJson = localStorage.getItem('ocr_model_json');
  const modelWeights = localStorage.getItem('ocr_model_weights');
  
  if (!modelJson || !modelWeights) {
    return null;
  }
  
  const artifacts = {
    modelTopology: JSON.parse(modelJson),
    weightData: base64ToArrayBuffer(modelWeights)
  };
  
  return tf.loadLayersModel(tf.io.fromMemory(
    () => Promise.resolve(artifacts.modelTopology),
    () => Promise.resolve(artifacts.weightData)
  ));
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function preprocessImageForPrediction(imageElement) {
  let tensor = tf.browser.fromPixels(imageElement, 1);
  tensor = tf.image.resizeBilinear(tensor, [IMAGE_HEIGHT, IMAGE_WIDTH]);
  tensor = tf.div(tensor, 255.0);
  return tensor;
}

export function interpretPrediction(drugPred, dosagePred) {
  const drugIdx = drugPred.argMax().dataSync()[0];
  const dosageIdx = dosagePred.argMax().dataSync()[0];
  
  return {
    drug: COMMON_DRUGS[drugIdx] || 'Unknown',
    dosage: COMMON_DOSAGES[dosageIdx] || 'Unknown',
    confidence: {
      drug: drugPred.dataSync()[drugIdx],
      dosage: dosagePred.dataSync()[dosageIdx]
    }
  };
}
