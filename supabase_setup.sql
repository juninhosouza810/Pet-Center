-- ================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Supabase Dashboard > SQL Editor > New Query
-- ================================================

-- 1. Cria a tabela principal (guarda todo o JSON do app)
CREATE TABLE IF NOT EXISTS petshop_data (
  id        INTEGER PRIMARY KEY DEFAULT 1,
  conteudo  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garante que so existe UMA linha (id=1)
ALTER TABLE petshop_data ADD CONSTRAINT single_row CHECK (id = 1);

-- 3. Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON petshop_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Row Level Security — permite leitura e escrita sem autenticacao
--    (a "autenticacao" e feita pelo proprio app via senha admin123)
ALTER TABLE petshop_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON petshop_data
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Insere a linha inicial vazia (se ainda nao existir)
INSERT INTO petshop_data (id, conteudo)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Pronto! Execute e verifique se aparece "Success" abaixo.
