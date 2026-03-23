from flask import Flask, render_template, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)

# Database configuration - convert postgres:// to postgresql+pg8000://
database_url = os.environ.get('DATABASE_URL', 'sqlite:///shootersproof.db')
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql+pg8000://', 1)
elif database_url.startswith('postgresql://'):
    database_url = database_url.replace('postgresql://', 'postgresql+pg8000://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

db = SQLAlchemy(app)

# ─── DATABASE MODELS (TABLES) ─────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    username      = db.Column(db.String(100), unique=True, nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    sessions      = db.relationship('Session', backref='user', lazy=True)

class Session(db.Model):
    __tablename__ = 'sessions'
    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    shot_count    = db.Column(db.Integer, nullable=False)
    distance      = db.Column(db.Float, nullable=False)
    distance_unit = db.Column(db.String(10), default='yards')
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    shots         = db.relationship('Shot', backref='session', lazy=True)
    equipment     = db.relationship('Equipment', backref='session', lazy=True, uselist=False)
    result        = db.relationship('Result', backref='session', lazy=True, uselist=False)

class Shot(db.Model):
    __tablename__ = 'shots'
    id         = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    x_pixels   = db.Column(db.Float, nullable=False)
    y_pixels   = db.Column(db.Float, nullable=False)
    x_inches   = db.Column(db.Float, nullable=True)
    y_inches   = db.Column(db.Float, nullable=True)
    shot_order = db.Column(db.Integer, nullable=False)

class Equipment(db.Model):
    __tablename__ = 'equipment'
    id                 = db.Column(db.Integer, primary_key=True)
    session_id         = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    rifle_make         = db.Column(db.String(100), nullable=True)
    rifle_model        = db.Column(db.String(100), nullable=True)
    caliber            = db.Column(db.String(50), nullable=True)
    barrel_length      = db.Column(db.Float, nullable=True)
    twist_rate         = db.Column(db.String(20), nullable=True)
    trigger            = db.Column(db.String(100), nullable=True)
    suppressor         = db.Column(db.Boolean, default=False)
    suppressor_model   = db.Column(db.String(100), nullable=True)
    muzzle_brake       = db.Column(db.Boolean, default=False)
    muzzle_brake_model = db.Column(db.String(100), nullable=True)
    tuner              = db.Column(db.Boolean, default=False)
    tuner_model        = db.Column(db.String(100), nullable=True)
    rest_type          = db.Column(db.String(100), nullable=True)
    ammo_type          = db.Column(db.String(20), nullable=True)
    ammo_brand         = db.Column(db.String(100), nullable=True)
    ammo_product       = db.Column(db.String(100), nullable=True)
    bullet_weight      = db.Column(db.Float, nullable=True)
    lot_number         = db.Column(db.String(50), nullable=True)
    powder             = db.Column(db.String(100), nullable=True)
    powder_charge      = db.Column(db.Float, nullable=True)
    primer             = db.Column(db.String(100), nullable=True)
    coal               = db.Column(db.Float, nullable=True)
    temperature        = db.Column(db.Float, nullable=True)
    wind               = db.Column(db.String(50), nullable=True)
    notes              = db.Column(db.Text, nullable=True)

class Result(db.Model):
    __tablename__ = 'results'
    id                 = db.Column(db.Integer, primary_key=True)
    session_id         = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    extreme_spread_in  = db.Column(db.Float, nullable=True)
    mean_radius_in     = db.Column(db.Float, nullable=True)
    cep_in             = db.Column(db.Float, nullable=True)
    sd_x_in            = db.Column(db.Float, nullable=True)
    sd_y_in            = db.Column(db.Float, nullable=True)
    figure_of_merit_in = db.Column(db.Float, nullable=True)
    extreme_spread_moa = db.Column(db.Float, nullable=True)
    mean_radius_moa    = db.Column(db.Float, nullable=True)
    confidence_score   = db.Column(db.Integer, nullable=True)
    confidence_label   = db.Column(db.String(20), nullable=True)
    mpi_x              = db.Column(db.Float, nullable=True)
    mpi_y              = db.Column(db.Float, nullable=True)

# ─── ROUTES ───────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'app': 'ShootersProof',
        'version': '0.2-beta',
        'database': 'connected'
    })

# ─── STARTUP ──────────────────────────────────────────────────

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
