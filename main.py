from fastapi import FastAPI

app = FastAPI(
    title="AI-Powered News Bulletin and Podcast API",
    description="A 12-factor API that summarizes news and creates podcasts.",
)

@app.get("/")
def root():
    return {"status": "active", "message": "System is ready for cloud-native transition!"}