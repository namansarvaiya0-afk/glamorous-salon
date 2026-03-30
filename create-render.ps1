$headers = @{
    "Authorization" = "Bearer rnd_p1HFwEiV5smV20BmBUaa26kgc7MW"
    "Content-Type" = "application/json"
}

$body = @{
    blueprint = @{
        services = @(
            @{
                name = "glamorous-salon"
                region = "oregon"
                type = "web_service"
                env = "node"
                buildCommand = "cd backend && npm install"
                startCommand = "cd backend && npm start"
                repo = "https://github.com/laxmanchoudhary4577-commits/glamorous-salon"
            }
        )
    }
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Uri "https://api.render.com/v1/blueprints/sync?ownerId=tea-d750acu3jp1c739apmng" -Method POST -Headers $headers -Body $body

$response | ConvertTo-Json
