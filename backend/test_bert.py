from bert_inference import BERTInference

bert = BERTInference(model_path='../ml_model/pulse_ml_model')

sentences = [
    "what are you talking about? that looks like gibberish",
    "whelloe ggrgergsgsgsgs",
    "Just finished an amazing coffee at the local cafe",
    "This product is the best ever and everyone should buy it",
    "Feeling grateful for another day",
]

print("-"*80)
for text in sentences:
    result = bert.predict(text)
    human = result['raw_scores']['human_probability']
    print(f"{human:5.1f}% - {text[:60]}...")
print("-"*80)