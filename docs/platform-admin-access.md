# Acceso seguro al panel global

## Host reservado

El panel global debe publicarse desde:

```txt
https://yoadministro.dibok.app
```

La app reserva el subdominio `yoadministro`, por lo que no se interpreta como tenant.

## Variables requeridas en Vercel

Configurar en Production:

```txt
PLATFORM_ADMIN_HOST=yoadministro.dibok.app
```

Si `APP_URL`, `ROOT_DOMAIN` o `TENANT_DOMAIN_SUFFIX` ya apuntan a `dibok.app`, el valor por defecto también resuelve a `yoadministro.dibok.app`, pero la variable explícita evita ambigüedades.

## Rutas habilitadas

Desde el host admin:

```txt
https://yoadministro.dibok.app/
https://yoadministro.dibok.app/login
https://yoadministro.dibok.app/platform/login
```

`/` redirige a `/platform`.
`/login` redirige a `/platform/login`.

## Bloqueo por host

Estas rutas sólo responden en `yoadministro.dibok.app` o localhost:

```txt
/platform/*
/api/platform/*
```

Si se intentan abrir desde `dibok.app` u otro tenant, responden `404`.

## Capa externa gratuita recomendada

La protección externa no se versiona en el repo porque depende del proveedor DNS/proxy, pero debe configurarse así:

1. Crear el DNS `yoadministro.dibok.app`.
2. Apuntarlo al mismo proyecto Vercel.
3. Proteger ese hostname con Cloudflare Access si el dominio usa Cloudflare.
4. Política mínima:
   - permitir sólo emails internos autorizados;
   - MFA desde el proveedor de identidad;
   - bloquear todo lo demás.

Si no se usa Cloudflare, configurar Vercel Firewall/Deployment Protection si está disponible en el plan. La app igual mantiene la segunda capa: login interno con `platform_users`.
