$ErrorActionPreference = 'Stop'

$argsList = kubectl get deployment metrics-server -n kube-system -o jsonpath='{.spec.template.spec.containers[0].args}'

if ($argsList -notmatch '--kubelet-insecure-tls') {
	kubectl patch deployment metrics-server -n kube-system --type='json' -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
}

kubectl rollout status deployment/metrics-server -n kube-system --timeout=120s
kubectl get apiservices v1beta1.metrics.k8s.io
kubectl top nodes
