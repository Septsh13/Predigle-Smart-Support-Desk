"""Small manual check that the local sentence-transformers model works."""
from sentence_transformers import SentenceTransformer


model = SentenceTransformer("all-MiniLM-L6-v2")
embedding = model.encode("hello", normalize_embeddings=True)
print("Model loaded OK")
print(f"Embedding length: {len(embedding)}")
