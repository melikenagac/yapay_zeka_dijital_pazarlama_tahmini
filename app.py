from flask import Flask, render_template, request, jsonify
import pandas as pd
import pickle
import json
from sklearn.preprocessing import LabelEncoder

app = Flask(__name__)
app.static_folder = 'static'

# Eğitilmiş modeli yükle
with open('model.pkl', 'rb') as model_file:
    model = pickle.load(model_file)

# Gün verilerini LabelEncoder ile dönüştürmek için bir sözlük oluştur
day_encoder = LabelEncoder()
day_encoder.fit(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'])

@app.route('/')
def index():
    try:
        # Excel dosyasını oku
        df = pd.read_excel('test.xlsx')

        # Sütun adlarını kontrol et ve gerekli düzenlemeleri yap
        expected_columns = {
            'Tarih (Date)': 'Tarih',
            'Gün (String)': 'Gün',
            'Para Birimi': 'Para Birimi',
            'Reklam Harcaması (TL)': 'Reklam Harcaması',
            'Reklamdan Kazanç (TL)': 'Reklamdan Kazanç'
        }
        
        missing_columns = [key for key in expected_columns.keys() if key not in df.columns]

        if missing_columns:
            return f"Excel dosyasında gerekli sütunlar eksik: {', '.join(missing_columns)}", 400

        # Sütunları yeniden adlandır
        df.rename(columns=expected_columns, inplace=True)

        # Gerekli düzenlemeleri yap
        df = df.dropna(subset=expected_columns.values())
        # Format the 'Tarih' column to remove the time part
        df['Tarih'] = pd.to_datetime(df['Tarih']).dt.strftime('%Y-%m-%d')

        # Format 'Reklam Harcaması' to have no decimal places
        df['Reklam Harcaması'] = df['Reklam Harcaması'].astype(int)

        # Verileri sözlük biçiminde alın
        data = df.to_dict(orient='records')
        return render_template('index.html', data=data)
    except Exception as e:
        return str(e), 500

@app.route('/predict', methods=['POST'])
def predict():
    day = request.json['day']
    day_encoded = day_encoder.transform([day])[0]
    cost = float(request.json['cost'])

    prediction = model.predict([[day_encoded, cost]])
    rounded_prediction = round(prediction[0], 2)  # Round to 2 decimal places

    return jsonify({'prediction': rounded_prediction})

@app.route('/chart-data', methods=['GET'])
def chart_data():
    try:
        df = pd.read_excel('test.xlsx')
        df = df.dropna(subset=['Reklam Harcaması (TL)', 'Reklamdan Kazanç (TL)'])

        cost_data = df['Reklam Harcaması (TL)'].tolist()
        revenue_data = df['Reklamdan Kazanç (TL)'].tolist()

        return jsonify({
            'cost': cost_data,
            'revenue': revenue_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/performance-metrics', methods=['GET'])
def get_performance_metrics():
    with open('performance_metrics.json', 'r') as f:
        performance_metrics = json.load(f)
    return jsonify(performance_metrics)

@app.route('/compare', methods=['POST'])
def compare():
    try:
        day = request.json['day']
        cost = float(request.json['cost'])

        # Verileri oku
        df = pd.read_excel('test.xlsx')
        df = df.dropna(subset=['Reklam Harcaması (TL)', 'Reklamdan Kazanç (TL)'])

        # En yakın gerçek değeri bul
        closest_row = df.iloc[(df['Reklam Harcaması (TL)'] - cost).abs().argsort()[:1]]

        real_revenue = closest_row['Reklamdan Kazanç (TL)'].values[0]

        day_encoded = day_encoder.transform([day])[0]
        predicted_revenue = model.predict([[day_encoded, cost]])[0]

        return jsonify({
            'real_revenue': real_revenue,
            'predicted_revenue': predicted_revenue
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
if __name__ == '__main__':
    app.run(debug=True) 
