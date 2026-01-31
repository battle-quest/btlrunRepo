# btl.run Domain Configuration

Configuration for the btl.run custom domain with CloudFront.

## Existing Resources

You already have these configured in AWS:

| Resource | Value |
|----------|-------|
| **Domain** | btl.run |
| **Hosted Zone ID** | Z064967319BVY1CFQ2IZX |
| **ACM Certificate ARN** | arn:aws:acm:us-east-1:615821144597:certificate/79e671d3-7e77-4114-9edb-00530b310414 |
| **Certificate Status** | ISSUED ✓ |
| **Region** | us-east-1 (required for CloudFront) |

## Production Configuration

These values are already configured in `infrastructure/parameters/prod.json`:

```json
{
  "Parameters": {
    "DomainName": "btl.run",
    "HostedZoneId": "Z064967319BVY1CFQ2IZX",
    "CertificateArn": "arn:aws:acm:us-east-1:615821144597:certificate/79e671d3-7e77-4114-9edb-00530b310414"
  }
}
```

## How It Works

When you deploy to production with these parameters:

### 1. CloudFront Distribution
- **Aliases:** btl.run (custom domain)
- **Certificate:** Uses your existing ACM certificate
- **HTTPS:** Enforced with SNI
- **Protocol:** Minimum TLSv1.2

### 2. Route 53 DNS
- **Record Type:** A record (alias to CloudFront)
- **Target:** CloudFront distribution domain
- **Hosted Zone:** Your existing btl.run hosted zone

### 3. SAM Template Logic

The CDN stack (`infrastructure/stacks/cdn.yaml`) has logic to:
- **Use existing certificate** if `CertificateArn` is provided
- **Create new certificate** if `DomainName` is set but no `CertificateArn`
- **Skip custom domain** if `DomainName` is empty

## Deployment

### Deploy to Production with Custom Domain

```powershell
# Deploy full stack (uses btl.run domain)
.\scripts\deploy.ps1 -Environment prod
```

SAM will:
1. Create CloudFront distribution with btl.run alias
2. Attach your existing SSL certificate
3. Create Route 53 A record pointing to CloudFront
4. Configure HTTPS redirect

### Verify Domain After Deployment

```powershell
# Get CloudFront domain
$outputs = aws cloudformation describe-stacks `
    --stack-name "btl-run-prod" `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

$cfDomain = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDomain" }).OutputValue
$websiteUrl = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteUrl" }).OutputValue

Write-Host "CloudFront Domain: $cfDomain"
Write-Host "Website URL: $websiteUrl"

# Test domain
Invoke-WebRequest -Uri "https://btl.run" -MaximumRedirection 0
```

### DNS Propagation

After deployment:
- CloudFront distribution: Available immediately
- DNS propagation: May take 5-15 minutes
- Full global propagation: Up to 48 hours (typically faster)

Check DNS:
```powershell
# Check if DNS is resolving
nslookup btl.run

# Check Route 53 record
aws route53 list-resource-record-sets `
    --hosted-zone-id Z064967319BVY1CFQ2IZX `
    --query "ResourceRecordSets[?Name=='btl.run.']" `
    --output table
```

## Development Environment

Dev environment doesn't use custom domain:

```json
{
  "DomainName": "",
  "HostedZoneId": "",
  "CertificateArn": ""
}
```

Access dev via CloudFront default domain (provided in stack outputs).

## Subdomain Configuration (Future)

To add subdomains (e.g., api.btl.run, www.btl.run):

### Option 1: Wildcard Certificate

Create/import wildcard certificate for `*.btl.run` in ACM, then:

```yaml
# In CDN template
Aliases:
  - btl.run
  - www.btl.run
  - api.btl.run
```

### Option 2: Separate Distributions

Create separate CloudFront distributions for each subdomain with their own certificates.

## SSL Certificate Management

Your certificate is already issued and valid. If you need to:

### Check Certificate Status

```powershell
aws acm describe-certificate `
    --certificate-arn "arn:aws:acm:us-east-1:615821144597:certificate/79e671d3-7e77-4114-9edb-00530b310414" `
    --query "Certificate.{Domain:DomainName, Status:Status, NotAfter:NotAfter}" `
    --output table
```

### Certificate Renewal

ACM automatically renews certificates if DNS validation records are in place.

**Verify validation records exist:**
```powershell
aws route53 list-resource-record-sets `
    --hosted-zone-id Z064967319BVY1CFQ2IZX `
    --query "ResourceRecordSets[?Type=='CNAME' && contains(Name, '_acm-challenge')]" `
    --output table
```

## Troubleshooting

### Issue: SSL Certificate Not Found

**Error:** CloudFormation fails with "Certificate not found"

**Fix:** Ensure certificate is in us-east-1 region (CloudFront requirement).

### Issue: Domain Not Resolving

**Cause:** DNS not propagated yet

**Fix:** Wait 5-15 minutes, clear DNS cache:
```powershell
ipconfig /flushdns
```

### Issue: HTTPS Not Working

**Cause:** Certificate not attached or expired

**Fix:** Verify certificate status and CloudFront configuration.

### Issue: Redirect Loop

**Cause:** Conflicting redirect rules

**Fix:** Check CloudFront behaviors and S3 redirect configuration.

## Security Considerations

With custom domain enabled:

- ✅ HTTPS enforced (HTTP redirects to HTTPS)
- ✅ TLS 1.2+ only (secure protocols)
- ✅ SNI for certificate serving
- ✅ Route 53 DNSSEC (enable if desired)

Consider adding:
- AWS WAF rules on CloudFront
- DDoS protection (AWS Shield Standard is automatic)
- Rate limiting at CloudFront level

## Production Checklist

Before enabling custom domain in production:

- [x] ACM certificate issued
- [x] Certificate in us-east-1 region
- [x] Hosted zone for btl.run exists
- [x] Parameters configured in prod.json
- [ ] Deploy to production
- [ ] Verify HTTPS works
- [ ] Test DNS resolution
- [ ] Check certificate is attached
- [ ] Verify redirect works (http → https)
