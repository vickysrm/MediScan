const tf = require('@tensorflow/tfjs');

const IMAGE_HEIGHT = 64;
const IMAGE_WIDTH = 256;

const COMMON_DRUGS = [
  'Metformin', 'Amlodipine', 'Omeprazole', 'Atorvastatin', 'Losartan',
  'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Cetirizine', 'Pantoprazole',
  'Ranitidine', 'Salbutamol', 'Montelukast', 'Metoprolol', 'Ramipril',
  'Telmisartan', 'Rosuvastatin', 'Gliclazide', 'Glimepiride', 'Enalapril'
];

const COMMON_DOSAGES = [
  '500mg', '1000mg', '5mg', '10mg', '20mg', '40mg', '50mg', '100mg',
  '200mg', '400mg', '650mg', '75mg', '150mg', '25mg', '12.5mg'
];

async function loadModel(modelPath) {
  console.log(`Loading model from ${modelPath}...`);
  const model = await tf.loadLayersModel(`${modelPath}/model.json`);
  return model;
}

function preprocessImage(imageData) {
  let tensor = tf.browser.fromPixels(imageData, 1);
  
  tensor = tf.image.resizeBilinear(tensor, [IMAGE_HEIGHT, IMAGE_WIDTH]);
  
  tensor = tf.div(tensor, 255.0);
  
  tensor = tf.expandDims(tensor, 0);
  
  return tensor;
}

async function predict(model, imageElement) {
  const inputTensor = preprocessImage(imageElement);
  
  const predictions = model.predict(inputTensor);
  
  tf.dispose(inputTensor);
  
  return predictions;
}

function interpretPredictions(drugPred, dosagePred, frequencyPred) {
  const drugIdx = drugPred.argMax(1).dataSync()[0];
  const dosageIdx = dosagePred.argMax(1).dataSync()[0];
  const freqIdx = frequencyPred.argMax(1).dataSync()[0];
  
  const drug = COMMON_DRUGS[drugIdx] || 'Unknown';
  const dosage = COMMON_DOSAGES[dosageIdx] || 'Unknown';
  
  return {
    drug,
    dosage,
    frequency: `Frequency class ${freqIdx}`,
    confidence: {
      drug: drugPred.dataSync()[drugIdx],
      dosage: dosagePred.dataSync()[dosageIdx]
    }
  };
}

module.exports = {
  loadModel,
  preprocessImage,
  predict,
  interpretPredictions
};
