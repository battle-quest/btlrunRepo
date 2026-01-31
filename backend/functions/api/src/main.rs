//! btl.run API Lambda handler
//!
//! Main entry point for the API Gateway Lambda function.
//! Handles routing and request processing.

use lambda_http::{run, service_fn, Body, Error, Request, Response};
use shared::{ApiResponse, HealthResponse};
use tracing::info;
use tracing_subscriber::filter::{EnvFilter, LevelFilter};

/// Main request handler
async fn handler(event: Request) -> Result<Response<Body>, Error> {
    let path = event.uri().path();
    let method = event.method().as_str();

    info!(path = %path, method = %method, "Handling request");

    match (method, path) {
        ("GET", "/health") | ("GET", "/api/health") => health_handler().await,
        ("GET", "/") | ("GET", "/api") => root_handler().await,
        _ => not_found_handler(path).await,
    }
}

/// Health check endpoint
async fn health_handler() -> Result<Response<Body>, Error> {
    let response = ApiResponse::success(HealthResponse::default());
    json_response(200, &response)
}

/// Root endpoint
async fn root_handler() -> Result<Response<Body>, Error> {
    let response = ApiResponse::success(serde_json::json!({
        "name": "btl.run API",
        "version": env!("CARGO_PKG_VERSION"),
        "endpoints": ["/health", "/api/health"]
    }));
    json_response(200, &response)
}

/// 404 handler
async fn not_found_handler(path: &str) -> Result<Response<Body>, Error> {
    let response: ApiResponse<()> = ApiResponse::error(format!("Not found: {}", path));
    json_response(404, &response)
}

/// Helper to create JSON responses
fn json_response<T: serde::Serialize>(status: u16, body: &T) -> Result<Response<Body>, Error> {
    let json = serde_json::to_string(body)?;
    Ok(Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .header("access-control-allow-origin", "*")
        .header("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS")
        .header("access-control-allow-headers", "Content-Type, Authorization")
        .body(Body::from(json))?)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env_lossy(),
        )
        .with_target(false)
        .without_time()
        .init();

    info!("Starting btl.run API Lambda");

    run(service_fn(handler)).await
}
