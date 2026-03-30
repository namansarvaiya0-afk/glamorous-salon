$headers = @{
    "Authorization" = "Bearer rnd_PtfPYtC9cwsGiT3yPhCPQZEjQmJx"
    "Content-Type" = "application/json"
}

$body = @{
    name = "glamorous-salon"
    region = "oregon"
    type = "web"
    env = "node"
    buildCommand = "cd backend && npm install"
    startCommand = "cd backend && npm start"
    repo = "https://github.com/laxmanchoudhary4577-commits/glamorous-salon"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://api.render.com/v1/services?ownerId=tea-d750acu3jp1c739apmng" -Method POST -Headers $headers -Body $body

$response | ConvertTo-Json
